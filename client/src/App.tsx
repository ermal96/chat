import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatScreen } from './components/ChatScreen';
import { Toast } from './components/Toast';
import type { Room, Message, ServerMessage } from '../../shared/types';

interface UserData {
  id: string;
  nickname: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [user, setUser] = useLocalStorage<UserData | null>('chat-user', null);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'room_created':
      case 'room_joined': {
        const payload = msg.payload as { room: Room; user: { id: string; nickname: string } };
        setUser({ id: payload.user.id, nickname: payload.user.nickname });
        setRooms(prev => new Map(prev).set(payload.room.id, payload.room));
        setCurrentRoom(payload.room);
        showToast(
          msg.type === 'room_created'
            ? `Room "${payload.room.name}" created! Code: ${payload.room.inviteCode}`
            : `Joined "${payload.room.name}"`,
          'success'
        );
        break;
      }

      case 'room_left': {
        const payload = msg.payload as { roomId: string };
        setRooms(prev => {
          const next = new Map(prev);
          next.delete(payload.roomId);
          return next;
        });
        setCurrentRoom(curr => curr?.id === payload.roomId ? null : curr);
        break;
      }

      case 'room_history': {
        const payload = msg.payload as { roomId: string; messages: Message[] };
        setMessages(prev => new Map(prev).set(payload.roomId, payload.messages));
        break;
      }

      case 'new_message': {
        const payload = msg.payload as { message: Message };
        setMessages(prev => {
          const roomMsgs = prev.get(payload.message.roomId) || [];
          return new Map(prev).set(payload.message.roomId, [...roomMsgs, payload.message]);
        });
        break;
      }

      case 'user_joined': {
        const payload = msg.payload as { roomId: string; user: { id: string; nickname: string } };
        setRooms(prev => {
          const room = prev.get(payload.roomId);
          if (!room) return prev;
          const members = room.members || [];
          if (!members.find(m => m.id === payload.user.id)) {
            members.push(payload.user);
          }
          return new Map(prev).set(payload.roomId, {
            ...room,
            memberCount: (room.memberCount || 0) + 1,
            members
          });
        });
        break;
      }

      case 'user_left': {
        const payload = msg.payload as { roomId: string; user: { id: string; nickname: string } };
        setRooms(prev => {
          const room = prev.get(payload.roomId);
          if (!room) return prev;
          return new Map(prev).set(payload.roomId, {
            ...room,
            memberCount: Math.max(0, (room.memberCount || 1) - 1),
            members: (room.members || []).filter(m => m.id !== payload.user.id)
          });
        });
        break;
      }

      case 'reconnected': {
        const payload = msg.payload as { user: { id: string; nickname: string }; rooms: Room[] };
        setUser({ id: payload.user.id, nickname: payload.user.nickname });
        const roomMap = new Map<string, Room>();
        payload.rooms.forEach(r => roomMap.set(r.id, r));
        setRooms(roomMap);
        if (payload.rooms.length > 0) {
          setCurrentRoom(payload.rooms[0]);
        }
        showToast(`Welcome back, ${payload.user.nickname}!`, 'success');
        break;
      }

      case 'room_list': {
        const payload = msg.payload as { rooms: Room[] };
        const roomMap = new Map<string, Room>();
        payload.rooms.forEach(r => roomMap.set(r.id, r));
        setRooms(roomMap);
        break;
      }

      case 'error': {
        const payload = msg.payload as { message: string };
        showToast(payload.message, 'error');
        break;
      }
    }
  }, [setUser, showToast]);

  const { send, connected } = useWebSocket(handleMessage);

  // Reconnect with stored user data
  useEffect(() => {
    if (connected && user) {
      send('reconnect', { userId: user.id, nickname: user.nickname });
    }
  }, [connected, user, send]);

  const handleCreateRoom = (nickname: string, roomName: string, roomType: 'group' | 'direct') => {
    send('create_room', { name: roomName, type: roomType, nickname, userId: user?.id });
  };

  const handleJoinRoom = (nickname: string, inviteCode: string) => {
    send('join_room', { inviteCode, nickname, userId: user?.id });
  };

  const handleSendMessage = (content: string) => {
    if (currentRoom) {
      send('send_message', { roomId: currentRoom.id, content });
    }
  };

  const handleLeaveRoom = (roomId: string) => {
    send('leave_room', { roomId });
  };

  const handleSelectRoom = (room: Room) => {
    setCurrentRoom(room);
    // Request message history if we don't have it
    if (!messages.has(room.id)) {
      send('get_rooms', {});
    }
  };

  const handleLogout = () => {
    // Leave all rooms
    rooms.forEach(room => {
      send('leave_room', { roomId: room.id });
    });
    setUser(null);
    setRooms(new Map());
    setCurrentRoom(null);
    setMessages(new Map());
  };

  const isLoggedIn = user && rooms.size > 0;

  return (
    <div className="app">
      {!isLoggedIn ? (
        <WelcomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          savedNickname={user?.nickname}
        />
      ) : (
        <ChatScreen
          user={user}
          rooms={rooms}
          currentRoom={currentRoom}
          messages={messages.get(currentRoom?.id || '') || []}
          onSelectRoom={handleSelectRoom}
          onSendMessage={handleSendMessage}
          onLeaveRoom={handleLeaveRoom}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLogout={handleLogout}
        />
      )}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  );
}

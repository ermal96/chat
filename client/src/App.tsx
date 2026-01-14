import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatScreen } from './components/ChatScreen';
import { Toast } from './components/Toast';
import type { Room, Message, ServerMessage, Reaction } from '../../shared/types';

interface UserData {
  id: string;
  nickname: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface TypingUser {
  id: string;
  nickname: string;
}

export default function App() {
  const [user, setUser] = useLocalStorage<UserData | null>('chat-user', null);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

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

      case 'message_edited': {
        const payload = msg.payload as { roomId: string; messageId: string; content: string; editedAt: string };
        setMessages(prev => {
          const roomMsgs = prev.get(payload.roomId) || [];
          const updated = roomMsgs.map(m =>
            m.id === payload.messageId
              ? { ...m, content: payload.content, edited: true, editedAt: payload.editedAt }
              : m
          );
          return new Map(prev).set(payload.roomId, updated);
        });
        break;
      }

      case 'message_deleted': {
        const payload = msg.payload as { roomId: string; messageId: string };
        setMessages(prev => {
          const roomMsgs = prev.get(payload.roomId) || [];
          const updated = roomMsgs.filter(m => m.id !== payload.messageId);
          return new Map(prev).set(payload.roomId, updated);
        });
        break;
      }

      case 'reaction_added':
      case 'reaction_removed': {
        const payload = msg.payload as { roomId: string; messageId: string; emoji: string; userId: string };
        setMessages(prev => {
          const roomMsgs = prev.get(payload.roomId) || [];
          const updated = roomMsgs.map(m => {
            if (m.id !== payload.messageId) return m;

            const reactions = [...(m.reactions || [])];
            const existingReaction = reactions.find(r => r.emoji === payload.emoji);

            if (msg.type === 'reaction_added') {
              if (existingReaction) {
                if (!existingReaction.users.includes(payload.userId)) {
                  existingReaction.users.push(payload.userId);
                }
              } else {
                reactions.push({ emoji: payload.emoji, users: [payload.userId] });
              }
            } else {
              if (existingReaction) {
                existingReaction.users = existingReaction.users.filter(u => u !== payload.userId);
                if (existingReaction.users.length === 0) {
                  const idx = reactions.indexOf(existingReaction);
                  reactions.splice(idx, 1);
                }
              }
            }

            return { ...m, reactions };
          });
          return new Map(prev).set(payload.roomId, updated);
        });
        break;
      }

      case 'typing': {
        const payload = msg.payload as { roomId: string; users: { id: string; nickname: string }[] };
        setTypingUsers(prev => new Map(prev).set(payload.roomId, payload.users));
        break;
      }

      case 'user_online':
      case 'user_offline': {
        const payload = msg.payload as { roomId: string; userId: string };
        setRooms(prev => {
          const room = prev.get(payload.roomId);
          if (!room) return prev;
          const onlineMembers = room.onlineMembers || [];
          const updated = msg.type === 'user_online'
            ? [...new Set([...onlineMembers, payload.userId])]
            : onlineMembers.filter(id => id !== payload.userId);
          return new Map(prev).set(payload.roomId, { ...room, onlineMembers: updated });
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
      const payload: { roomId: string; content: string; replyTo?: { id: string; nickname: string; content: string } } = {
        roomId: currentRoom.id,
        content
      };
      if (replyingTo) {
        payload.replyTo = {
          id: replyingTo.id,
          nickname: replyingTo.nickname,
          content: replyingTo.content.slice(0, 100)
        };
        setReplyingTo(null);
      }
      send('send_message', payload);
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    if (currentRoom) {
      send('edit_message', { messageId, roomId: currentRoom.id, content });
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (currentRoom) {
      send('delete_message', { messageId, roomId: currentRoom.id });
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (currentRoom) {
      send('add_reaction', { messageId, roomId: currentRoom.id, emoji });
    }
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    if (currentRoom) {
      send('remove_reaction', { messageId, roomId: currentRoom.id, emoji });
    }
  };

  const handleTypingStart = () => {
    if (currentRoom) {
      send('typing_start', { roomId: currentRoom.id });
    }
  };

  const handleTypingStop = () => {
    if (currentRoom) {
      send('typing_stop', { roomId: currentRoom.id });
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleLeaveRoom = (roomId: string) => {
    send('leave_room', { roomId });
  };

  const handleSelectRoom = (room: Room) => {
    setCurrentRoom(room);
    setReplyingTo(null);
    if (!messages.has(room.id)) {
      send('get_rooms', {});
    }
  };

  const handleLogout = () => {
    rooms.forEach(room => {
      send('leave_room', { roomId: room.id });
    });
    setUser(null);
    setRooms(new Map());
    setCurrentRoom(null);
    setMessages(new Map());
    setReplyingTo(null);
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
          typingUsers={typingUsers.get(currentRoom?.id || '') || []}
          replyingTo={replyingTo}
          onSelectRoom={handleSelectRoom}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onAddReaction={handleAddReaction}
          onRemoveReaction={handleRemoveReaction}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onReply={handleReply}
          onCancelReply={handleCancelReply}
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

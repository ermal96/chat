import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatScreen } from './components/ChatScreen';
import { Toast } from './components/Toast';
import type { Room, Message, ServerMessage } from '../../shared/types';

interface UserData {
  id: string;
  nickname: string;
  email?: string;
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

// Request notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Play notification sound
function playNotificationSound() {
  try {
    // Create and play a simple notification sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound:', e);
  }
}

// Show browser notification (sound is handled separately)
function showNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-message',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
}

export default function App() {
  const [user, setUser] = useLocalStorage<UserData | null>('chat-user', null);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Track if we've already sent reconnect for this connection
  const hasReconnectedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'registered': {
        const payload = msg.payload as { user: { id: string; nickname: string; email: string } };
        setUser({ id: payload.user.id, nickname: payload.user.nickname, email: payload.user.email });
        currentUserIdRef.current = payload.user.id;
        showToast('Account created successfully!', 'success');
        break;
      }

      case 'logged_in': {
        const payload = msg.payload as { user: { id: string; nickname: string; email: string }; rooms: Room[] };
        setUser({ id: payload.user.id, nickname: payload.user.nickname, email: payload.user.email });
        currentUserIdRef.current = payload.user.id;
        const roomMap = new Map<string, Room>();
        payload.rooms.forEach(r => roomMap.set(r.id, r));
        setRooms(roomMap);
        if (payload.rooms.length > 0) {
          setCurrentRoom(payload.rooms[0]);
        }
        showToast(`Welcome back, ${payload.user.nickname}!`, 'success');
        break;
      }

      case 'room_created':
      case 'room_joined': {
        const payload = msg.payload as { room: Room; user: { id: string; nickname: string } };
        setUser(prev => prev ? { ...prev, id: payload.user.id, nickname: payload.user.nickname } : { id: payload.user.id, nickname: payload.user.nickname });
        currentUserIdRef.current = payload.user.id;
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

        // Play sound and show notification for messages from others
        if (payload.message.userId !== currentUserIdRef.current) {
          // Always play sound for incoming messages
          playNotificationSound();

          // Show browser notification if document is hidden
          showNotification(
            payload.message.nickname,
            payload.message.content.length > 100
              ? payload.message.content.slice(0, 100) + '...'
              : payload.message.content
          );
        }
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
        const payload = msg.payload as { roomId: string; messageId: string; emoji: string; userId: string; nickname?: string };
        setMessages(prev => {
          const roomMsgs = prev.get(payload.roomId) || [];
          const updated = roomMsgs.map(m => {
            if (m.id !== payload.messageId) return m;

            const reactions = [...(m.reactions || [])];
            const existingReaction = reactions.find(r => r.emoji === payload.emoji);
            const reactionUser = { id: payload.userId, nickname: payload.nickname || 'Unknown' };

            if (msg.type === 'reaction_added') {
              if (existingReaction) {
                if (!existingReaction.users.some(u => u.id === payload.userId)) {
                  existingReaction.users.push(reactionUser);
                }
              } else {
                reactions.push({ emoji: payload.emoji, users: [reactionUser] });
              }
            } else {
              if (existingReaction) {
                existingReaction.users = existingReaction.users.filter(u => u.id !== payload.userId);
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
        currentUserIdRef.current = payload.user.id;
        setIsReconnecting(false);
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

      case 'nickname_changed': {
        const payload = msg.payload as { user?: { id: string; nickname: string }; roomId?: string; userId?: string; oldNickname?: string; newNickname?: string };
        // If this is for the current user (direct response)
        if (payload.user) {
          setUser(prev => prev ? { ...prev, nickname: payload.user!.nickname } : null);
          showToast('Nickname changed successfully!', 'success');
        }
        // If this is a broadcast about another user's nickname change
        if (payload.roomId && payload.userId && payload.newNickname) {
          setRooms(prev => {
            const room = prev.get(payload.roomId!);
            if (!room) return prev;
            const members = (room.members || []).map(m =>
              m.id === payload.userId ? { ...m, nickname: payload.newNickname! } : m
            );
            return new Map(prev).set(payload.roomId!, { ...room, members });
          });
        }
        break;
      }

      case 'push_subscribed': {
        console.log('Push notifications enabled');
        break;
      }

      case 'messages_read': {
        const payload = msg.payload as { roomId: string; messageIds: string[]; expiresAt: string };
        // Update messages with expiration time
        setMessages(prev => {
          const roomMessages = prev.get(payload.roomId);
          if (!roomMessages) return prev;
          const updated = roomMessages.map(m =>
            payload.messageIds.includes(m.id) ? { ...m, expiresAt: payload.expiresAt } : m
          );
          return new Map(prev).set(payload.roomId, updated);
        });
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

  // Reconnect with stored user data - only once per connection
  useEffect(() => {
    if (connected && user && !hasReconnectedRef.current) {
      hasReconnectedRef.current = true;
      currentUserIdRef.current = user.id;
      setIsReconnecting(true);
      send('reconnect', { userId: user.id, nickname: user.nickname });
    }

    // Reset the flag when disconnected
    if (!connected) {
      hasReconnectedRef.current = false;
    }
  }, [connected, user, send]);

  // Fetch room history when currentRoom changes
  useEffect(() => {
    if (connected && currentRoom && !messages.has(currentRoom.id)) {
      send('get_room_history', { roomId: currentRoom.id });
    }
  }, [connected, currentRoom, send, messages]);

  // Mark messages as read when viewing them (starts 2-minute expiration countdown)
  useEffect(() => {
    if (!connected || !currentRoom || document.hidden) return;

    const roomMessages = messages.get(currentRoom.id) || [];
    // Find messages without expiresAt (not yet read)
    const unreadIds = roomMessages
      .filter(m => !m.expiresAt)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      send('mark_read', { roomId: currentRoom.id, messageIds: unreadIds });
    }
  }, [connected, currentRoom, messages, send]);

  // Handle visibility change - mark messages as read when window becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && connected && currentRoom) {
        const roomMessages = messages.get(currentRoom.id) || [];
        const unreadIds = roomMessages
          .filter(m => !m.expiresAt)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          send('mark_read', { roomId: currentRoom.id, messageIds: unreadIds });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connected, currentRoom, messages, send]);

  const handleRegister = (email: string, password: string, nickname: string) => {
    send('register', { email, password, nickname });
  };

  const handleLogin = (email: string, password: string) => {
    send('login', { email, password });
  };

  const handleCreateRoom = (nickname: string, roomName: string, roomType: 'group' | 'direct') => {
    send('create_room', { name: roomName, type: roomType, nickname, userId: user?.id });
  };

  const handleJoinRoom = (nickname: string, inviteCode: string) => {
    send('join_room', { inviteCode, nickname, userId: user?.id });
  };

  const handleSendMessage = (content: string, imageUrl?: string) => {
    if (currentRoom) {
      const payload: { roomId: string; content: string; imageUrl?: string; replyTo?: { id: string; nickname: string; content: string } } = {
        roomId: currentRoom.id,
        content,
        imageUrl
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
    // Always fetch room history when selecting a room
    send('get_room_history', { roomId: room.id });
  };

  const handleChangeNickname = (newNickname: string) => {
    send('change_nickname', { nickname: newNickname });
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
    hasReconnectedRef.current = false;
    currentUserIdRef.current = null;
  };

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Get VAPID key
      const response = await fetch('/api/push/vapid-key');
      const { publicKey } = await response.json();

      // Convert VAPID key
      const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send to server
      send('subscribe_push', { subscription: subscription.toJSON() });
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }, [send]);

  // Subscribe to push when logged in
  useEffect(() => {
    if (connected && user && user.email) {
      subscribeToPush();
    }
  }, [connected, user, subscribeToPush]);

  // User is logged in if they have an email (registered user)
  const isLoggedIn = user && user.email;

  // Show loading while reconnecting
  if (isReconnecting) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Reconnecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {!isLoggedIn ? (
        <WelcomeScreen
          onRegister={handleRegister}
          onLogin={handleLogin}
          savedEmail={user?.email}
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
          onChangeNickname={handleChangeNickname}
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

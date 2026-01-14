// Types
interface Room {
  id: string;
  inviteCode: string;
  name: string;
  type: 'group' | 'direct';
  memberCount: number;
  members: { id: string; nickname: string }[];
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: string;
}

interface User {
  id: string;
  nickname: string;
}

// State
let ws: WebSocket | null = null;
let currentUser: User | null = null;
let currentRoom: Room | null = null;
let rooms: Map<string, Room> = new Map();

// Elements
const welcomeScreen = document.getElementById('welcome-screen')!;
const chatScreen = document.getElementById('chat-screen')!;
const createNicknameInput = document.getElementById('create-nickname') as HTMLInputElement;
const roomNameInput = document.getElementById('room-name') as HTMLInputElement;
const roomTypeSelect = document.getElementById('room-type') as HTMLSelectElement;
const createRoomBtn = document.getElementById('create-room-btn')!;
const joinNicknameInput = document.getElementById('join-nickname') as HTMLInputElement;
const inviteCodeInput = document.getElementById('invite-code') as HTMLInputElement;
const joinRoomBtn = document.getElementById('join-room-btn')!;
const roomList = document.getElementById('room-list')!;
const currentUserSpan = document.getElementById('current-user')!;
const noRoomSelected = document.getElementById('no-room-selected')!;
const chatArea = document.getElementById('chat-area')!;
const currentRoomName = document.getElementById('current-room-name')!;
const currentRoomMembers = document.getElementById('current-room-members')!;
const messagesContainer = document.getElementById('messages')!;
const messageForm = document.getElementById('message-form') as HTMLFormElement;
const messageInput = document.getElementById('message-input') as HTMLInputElement;
const showInviteBtn = document.getElementById('show-invite-btn')!;
const leaveRoomBtn = document.getElementById('leave-room-btn')!;
const inviteModal = document.getElementById('invite-modal')!;
const modalInviteCode = document.getElementById('modal-invite-code')!;
const copyCodeBtn = document.getElementById('copy-code-btn')!;
const closeModalBtn = document.getElementById('close-modal-btn')!;
const newRoomBtn = document.getElementById('new-room-btn')!;
const newRoomModal = document.getElementById('new-room-modal')!;
const modalRoomName = document.getElementById('modal-room-name') as HTMLInputElement;
const modalRoomType = document.getElementById('modal-room-type') as HTMLSelectElement;
const modalCreateBtn = document.getElementById('modal-create-btn')!;
const modalInviteInput = document.getElementById('modal-invite-input') as HTMLInputElement;
const modalJoinBtn = document.getElementById('modal-join-btn')!;
const closeNewRoomModal = document.getElementById('close-new-room-modal')!;
const toastContainer = document.getElementById('toast-container')!;

// Connect to WebSocket
function connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      console.log('Connected to server');
      resolve();
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      showToast('Disconnected from server', 'error');
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    };
  });
}

// Send message to server
function send(type: string, payload: any): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

// Handle server messages
function handleServerMessage(message: { type: string; payload: any }): void {
  switch (message.type) {
    case 'room_created':
      handleRoomCreated(message.payload);
      break;
    case 'room_joined':
      handleRoomJoined(message.payload);
      break;
    case 'room_left':
      handleRoomLeft(message.payload);
      break;
    case 'room_history':
      handleRoomHistory(message.payload);
      break;
    case 'new_message':
      handleNewMessage(message.payload);
      break;
    case 'user_joined':
      handleUserJoined(message.payload);
      break;
    case 'user_left':
      handleUserLeft(message.payload);
      break;
    case 'error':
      showToast(message.payload.message, 'error');
      break;
  }
}

function handleRoomCreated(payload: { room: Room; user: User }): void {
  currentUser = payload.user;
  rooms.set(payload.room.id, payload.room);
  currentRoom = payload.room;

  showChatScreen();
  updateRoomList();
  selectRoom(payload.room.id);
  showToast(`Room "${payload.room.name}" created! Code: ${payload.room.inviteCode}`, 'success');
}

function handleRoomJoined(payload: { room: Room; user: User }): void {
  if (!currentUser) {
    currentUser = payload.user;
    showChatScreen();
  }
  rooms.set(payload.room.id, payload.room);
  updateRoomList();
  selectRoom(payload.room.id);
  showToast(`Joined "${payload.room.name}"`, 'success');
}

function handleRoomLeft(payload: { roomId: string }): void {
  rooms.delete(payload.roomId);
  updateRoomList();

  if (currentRoom?.id === payload.roomId) {
    currentRoom = null;
    chatArea.classList.add('hidden');
    noRoomSelected.style.display = 'flex';
    messagesContainer.innerHTML = '';
  }

  if (rooms.size === 0) {
    showWelcomeScreen();
  }
}

function handleRoomHistory(payload: { roomId: string; messages: Message[] }): void {
  if (currentRoom?.id === payload.roomId) {
    messagesContainer.innerHTML = '';
    payload.messages.forEach((msg) => appendMessage(msg));
    scrollToBottom();
  }
}

function handleNewMessage(payload: { message: Message }): void {
  const msg = payload.message;
  if (currentRoom?.id === msg.roomId) {
    appendMessage(msg);
    scrollToBottom();
  }
}

function handleUserJoined(payload: { roomId: string; user: { id: string; nickname: string } }): void {
  const room = rooms.get(payload.roomId);
  if (room) {
    room.members.push(payload.user);
    room.memberCount++;
    if (currentRoom?.id === payload.roomId) {
      updateRoomHeader();
      appendSystemMessage(`${payload.user.nickname} joined the chat`);
    }
  }
}

function handleUserLeft(payload: { roomId: string; user: { id: string; nickname: string } }): void {
  const room = rooms.get(payload.roomId);
  if (room) {
    room.members = room.members.filter((m) => m.id !== payload.user.id);
    room.memberCount--;
    if (currentRoom?.id === payload.roomId) {
      updateRoomHeader();
      appendSystemMessage(`${payload.user.nickname} left the chat`);
    }
  }
}

// UI Functions
function showWelcomeScreen(): void {
  welcomeScreen.classList.add('active');
  chatScreen.classList.remove('active');
}

function showChatScreen(): void {
  welcomeScreen.classList.remove('active');
  chatScreen.classList.add('active');
  currentUserSpan.textContent = `Logged in as: ${currentUser?.nickname}`;
}

function updateRoomList(): void {
  roomList.innerHTML = '';
  rooms.forEach((room) => {
    const li = document.createElement('li');
    li.dataset.roomId = room.id;
    if (currentRoom?.id === room.id) {
      li.classList.add('active');
    }
    li.innerHTML = `
      <div class="room-name">${escapeHtml(room.name)}</div>
      <div class="room-type">${room.type === 'group' ? 'Group' : 'Direct'} · ${room.memberCount} member${room.memberCount !== 1 ? 's' : ''}</div>
    `;
    li.addEventListener('click', () => selectRoom(room.id));
    roomList.appendChild(li);
  });
}

function selectRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  currentRoom = room;
  updateRoomList();
  updateRoomHeader();

  noRoomSelected.style.display = 'none';
  chatArea.classList.remove('hidden');
  messagesContainer.innerHTML = '';
  messageInput.focus();
}

function updateRoomHeader(): void {
  if (!currentRoom) return;
  currentRoomName.textContent = currentRoom.name;
  currentRoomMembers.textContent = `${currentRoom.memberCount} member${currentRoom.memberCount !== 1 ? 's' : ''} · ${currentRoom.type === 'group' ? 'Group' : 'Direct'}`;
}

function appendMessage(msg: Message): void {
  const div = document.createElement('div');
  div.classList.add('message');
  if (msg.userId === currentUser?.id) {
    div.classList.add('own');
  }

  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  div.innerHTML = `
    <div class="sender">${escapeHtml(msg.nickname)}</div>
    <div class="content">${escapeHtml(msg.content)}</div>
    <div class="time">${time}</div>
  `;

  messagesContainer.appendChild(div);
}

function appendSystemMessage(text: string): void {
  const div = document.createElement('div');
  div.classList.add('system-message');
  div.textContent = text;
  messagesContainer.appendChild(div);
  scrollToBottom();
}

function scrollToBottom(): void {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
createRoomBtn.addEventListener('click', async () => {
  const nickname = createNicknameInput.value.trim();
  const name = roomNameInput.value.trim();
  const type = roomTypeSelect.value as 'group' | 'direct';

  if (!nickname) {
    showToast('Please enter a nickname', 'error');
    return;
  }
  if (!name) {
    showToast('Please enter a room name', 'error');
    return;
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    await connect();
  }

  send('create_room', { name, type, nickname });
});

joinRoomBtn.addEventListener('click', async () => {
  const nickname = joinNicknameInput.value.trim();
  const inviteCode = inviteCodeInput.value.trim().toUpperCase();

  if (!nickname) {
    showToast('Please enter a nickname', 'error');
    return;
  }
  if (!inviteCode) {
    showToast('Please enter an invite code', 'error');
    return;
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    await connect();
  }

  send('join_room', { inviteCode, nickname });
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();

  if (!content || !currentRoom) return;

  send('send_message', { roomId: currentRoom.id, content });
  messageInput.value = '';
});

showInviteBtn.addEventListener('click', () => {
  if (!currentRoom) return;
  modalInviteCode.textContent = currentRoom.inviteCode;
  inviteModal.classList.remove('hidden');
});

copyCodeBtn.addEventListener('click', () => {
  if (!currentRoom) return;
  navigator.clipboard.writeText(currentRoom.inviteCode);
  showToast('Invite code copied!', 'success');
});

closeModalBtn.addEventListener('click', () => {
  inviteModal.classList.add('hidden');
});

leaveRoomBtn.addEventListener('click', () => {
  if (!currentRoom) return;
  if (confirm(`Leave "${currentRoom.name}"?`)) {
    send('leave_room', { roomId: currentRoom.id });
  }
});

newRoomBtn.addEventListener('click', () => {
  newRoomModal.classList.remove('hidden');
});

closeNewRoomModal.addEventListener('click', () => {
  newRoomModal.classList.add('hidden');
});

// Tab switching in modal
document.querySelectorAll('.modal-tabs .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabName = (tab as HTMLElement).dataset.tab;
    document.querySelectorAll('.modal-tabs .tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
  });
});

modalCreateBtn.addEventListener('click', () => {
  const name = modalRoomName.value.trim();
  const type = modalRoomType.value as 'group' | 'direct';

  if (!name) {
    showToast('Please enter a room name', 'error');
    return;
  }

  send('create_room', { name, type, nickname: currentUser?.nickname });
  newRoomModal.classList.add('hidden');
  modalRoomName.value = '';
});

modalJoinBtn.addEventListener('click', () => {
  const inviteCode = modalInviteInput.value.trim().toUpperCase();

  if (!inviteCode) {
    showToast('Please enter an invite code', 'error');
    return;
  }

  send('join_room', { inviteCode, nickname: currentUser?.nickname });
  newRoomModal.classList.add('hidden');
  modalInviteInput.value = '';
});

// Close modals when clicking outside
[inviteModal, newRoomModal].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// Auto-uppercase invite code input
[inviteCodeInput, modalInviteInput].forEach((input) => {
  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase();
  });
});

// Initialize
console.log('Invite Chat initialized');

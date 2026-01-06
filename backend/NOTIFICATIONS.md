# Real-Time Notifications System

## 🎯 Overview

CypherMed now includes a complete real-time notification system with WebSocket support for instant updates and push notifications. Patients receive notifications when:

- Access is requested by providers
- Access is granted or denied
- Access is revoked
- Medical records are created, updated, or accessed
- Emergency access occurs (future)

---

## ✨ Features

### Real-Time Notifications via WebSocket
- ✅ **Instant push notifications** when events occur
- ✅ **Persistent notifications** stored in database
- ✅ **Read/unread tracking** with timestamps
- ✅ **Priority levels** (low, normal, high, urgent)
- ✅ **Notification types** (access_request, access_granted, record_created, etc.)
- ✅ **Real-time unread count** updates

### Notification Management
- ✅ **Get all notifications** with filtering
- ✅ **Mark as read** (individual or bulk)
- ✅ **Delete notifications** (individual or all read)
- ✅ **Notification statistics** and summaries
- ✅ **Filter by type, priority, status**

---

## 🔌 WebSocket Connection

### Client Connection

```javascript
import io from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3000');

// Authenticate with wallet address
socket.on('connect', () => {
  socket.emit('authenticate', 'patient_wallet_address');
});

// Listen for authentication confirmation
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
  // { wallet: 'patient_wallet_address', socketId: 'abc123' }
});

// Listen for new notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Display notification to user
  showNotification(notification.title, notification.message);
});

// Listen for unread count updates
socket.on('unread_count', (data) => {
  console.log('Unread notifications:', data.count);
  updateBadgeCount(data.count);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

### Mark Notification as Read (via WebSocket)

```javascript
socket.emit('mark_read', {
  notificationId: 'notification_uuid',
  wallet: 'patient_wallet_address'
});
```

### Mark All as Read (via WebSocket)

```javascript
socket.emit('mark_all_read', {
  wallet: 'patient_wallet_address'
});
```

---

## 📡 REST API Endpoints

### Get All Notifications

```bash
GET /api/notifications?wallet=patient_wallet&unreadOnly=true&limit=50

# Filter by type
GET /api/notifications?wallet=patient_wallet&type=access_request

# Filter by priority
GET /api/notifications?wallet=patient_wallet&priority=high
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "patientId": "patient_uuid",
      "type": "access_request",
      "title": "New Access Request",
      "message": "Dr. Smith (Doctor) has requested access to your medical records.",
      "read": false,
      "priority": "high",
      "metadata": {
        "requestId": "request_uuid",
        "requester": "doctor_wallet",
        "role": "Doctor"
      },
      "createdAt": "2026-01-06T20:30:00Z",
      "readAt": null
    }
  ],
  "pagination": {
    "total": 15,
    "unreadCount": 5,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Single Notification

```bash
GET /api/notifications/:id
```

### Mark Notification as Read

```bash
PATCH /api/notifications/:id/read
```

### Mark All as Read

```bash
POST /api/notifications/mark-all-read
Content-Type: application/json

{
  "wallet": "patient_wallet_address"
}
```

### Delete Notification

```bash
DELETE /api/notifications/:id
```

### Delete All Read Notifications

```bash
DELETE /api/notifications
Content-Type: application/json

{
  "wallet": "patient_wallet_address"
}
```

### Get Notification Statistics

```bash
GET /api/notifications/stats/summary?wallet=patient_wallet
```

**Response:**
```json
{
  "summary": {
    "total": 50,
    "unread": 5,
    "read": 45
  },
  "byType": [
    { "type": "access_request", "count": 15 },
    { "type": "access_granted", "count": 20 },
    { "type": "record_created", "count": 10 }
  ],
  "byPriority": [
    { "priority": "high", "count": 10 },
    { "priority": "normal", "count": 35 },
    { "priority": "low", "count": 5 }
  ],
  "recentNotifications": [...]
}
```

---

## 🔔 Notification Types

### access_request
**When:** A provider requests access to patient records  
**Priority:** High  
**Example:** "Dr. Smith (Doctor) has requested access to your medical records."

### access_granted
**When:** Patient grants access to a provider  
**Priority:** Normal  
**Example:** "You have granted Dr. Smith access to your Prescription records."

### access_denied
**When:** Patient denies an access request  
**Priority:** Normal  
**Example:** "Access request from Dr. Smith has been denied."

### access_revoked
**When:** Patient revokes provider access  
**Priority:** Normal  
**Example:** "Access for Dr. Smith has been revoked."

### record_created
**When:** A new medical record is added  
**Priority:** Normal  
**Example:** "A new Prescription record has been added by Dr. Smith."

### record_updated
**When:** An existing record is modified  
**Priority:** Normal  
**Example:** "Your LabResult record has been updated by Lab Tech."

### record_accessed
**When:** A provider views a record  
**Priority:** Low  
**Example:** "Dr. Smith accessed your Prescription record."

### emergency_access
**When:** Emergency responder accesses records  
**Priority:** Urgent  
**Example:** "Emergency responder John Doe accessed your records. Reason: Emergency treatment."

---

## 🎨 Frontend Integration Examples

### React Hook for Notifications

```javascript
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

export function useNotifications(wallet) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!wallet) return;

    // Connect to WebSocket
    const newSocket = io('http://localhost:3000');
    
    newSocket.on('connect', () => {
      newSocket.emit('authenticate', wallet);
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png'
        });
      }
    });

    newSocket.on('unread_count', (data) => {
      setUnreadCount(data.count);
    });

    setSocket(newSocket);

    // Cleanup
    return () => newSocket.close();
  }, [wallet]);

  const markAsRead = (notificationId) => {
    if (socket) {
      socket.emit('mark_read', { notificationId, wallet });
    }
  };

  const markAllAsRead = () => {
    if (socket) {
      socket.emit('mark_all_read', { wallet });
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
```

### Usage in Component

```javascript
function NotificationCenter({ wallet }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(wallet);

  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      <button onClick={markAllAsRead}>Mark All as Read</button>
      
      {notifications.map(notif => (
        <div 
          key={notif.id} 
          className={notif.read ? 'read' : 'unread'}
          onClick={() => markAsRead(notif.id)}
        >
          <h3>{notif.title}</h3>
          <p>{notif.message}</p>
          <span className={`priority-${notif.priority}`}>{notif.priority}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 🧪 Testing Notifications

### Test WebSocket Connection

```javascript
// test-websocket.js
const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  socket.emit('authenticate', 'test_wallet_123');
});

socket.on('authenticated', (data) => {
  console.log('Authenticated:', data);
});

socket.on('notification', (notification) => {
  console.log('Received notification:', notification);
});

socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
});
```

Run: `node test-websocket.js`

### Test Creating Notification

```bash
# Create an access request (triggers notification)
curl -X POST http://localhost:3000/api/access-requests \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_uuid",
    "requester": "doctor_wallet_456",
    "role": "Doctor",
    "reason": "Need to review patient history"
  }'

# Check notifications
curl "http://localhost:3000/api/notifications?wallet=patient_wallet"
```

---

## 📊 Database Schema

```sql
model Notification {
  id         String   @id @default(uuid())
  patientId  String
  patient    Patient  @relation(fields: [patientId], references: [id])
  type       String   -- notification type
  title      String   -- notification title
  message    String   -- notification message
  read       Boolean  @default(false)
  priority   String   @default("normal") -- low, normal, high, urgent
  metadata   Json?    -- additional data
  createdAt  DateTime @default(now())
  readAt     DateTime? -- when marked as read
}
```

---

## 🚀 Production Considerations

### Security
- ✅ Validate wallet addresses before authentication
- ✅ Implement rate limiting for WebSocket connections
- ✅ Add CORS configuration for production domains
- ✅ Use HTTPS/WSS in production

### Performance
- ✅ Implement notification pagination
- ✅ Auto-delete old read notifications (30+ days)
- ✅ Use Redis for WebSocket scaling (multiple servers)
- ✅ Batch notifications for high-frequency events

### User Experience
- ✅ Browser push notifications with service workers
- ✅ Email/SMS fallback for offline users
- ✅ Notification preferences (disable certain types)
- ✅ Notification sound/vibration options

---

## 📝 Next Steps

Potential enhancements:
- [ ] Email notifications for offline users
- [ ] SMS notifications for urgent events
- [ ] Notification preferences management
- [ ] Scheduled notifications (reminders)
- [ ] Notification templates customization
- [ ] Multi-language support
- [ ] Notification grouping/threading
- [ ] Rich media notifications (images, actions)

---

**Built with ❤️ for CypherMed**

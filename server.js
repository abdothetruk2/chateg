import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import connectDB from "./lib/mongoose.js";
import User from "./models/User.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
const users = {};
const userSockets = {};

async function setUserPresence(username, isOnline, socketId = "") {
  if (!username) return;

  try {
    await connectDB();
    await User.findOneAndUpdate(
      { username },
      {
        status: isOnline,
        displayname: isOnline ? "online" : "offline",
        socketId,
      }
    );
  } catch (error) {
    console.error("Presence update failed:", error);
  }
}

async function resetPresenceOnBoot() {
  try {
    await connectDB();
    await User.updateMany(
      { status: true },
      { status: false, displayname: "offline", socketId: "" }
    );
  } catch (error) {
    console.error("Presence reset failed:", error);
  }
}

function getConversationType(data = {}) {
  if (data.conversationType === "group" || data.type === "group") {
    return "group";
  }

  if (data.type === "location" && data.chat) {
    return "group";
  }

  return "user";
}

app.prepare().then(async () => {
  await resetPresenceOnBoot();

  const httpServer = createServer(handler);
  const keepAliveTimeout = Number.parseInt(
    process.env.KEEP_ALIVE_TIMEOUT_MS || "65000",
    10
  );
  httpServer.keepAliveTimeout = keepAliveTimeout;
  httpServer.headersTimeout = keepAliveTimeout + 5000;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});  io.on("connection", (socket) => {
    socket.on("user", async function (username) {
      if (!username) return;

      if (socket.data.username && socket.data.username !== username) {
        const previousUsername = socket.data.username;
        userSockets[previousUsername]?.delete(socket.id);
        if (userSockets[previousUsername]?.size === 0) {
          delete userSockets[previousUsername];
          delete users[previousUsername];
          await setUserPresence(previousUsername, false, "");
          io.emit("presence", {
            username: previousUsername,
            status: false,
            displayname: "offline",
          });
        }
      }

      socket.data.username = username;
      userSockets[username] ||= new Set();
      userSockets[username].add(socket.id);
      users[username] = socket.id;
      await setUserPresence(username, true, socket.id);
      socket.emit("id", { data: socket.id });
      io.emit("presence", {
        username,
        status: true,
        displayname: "online",
      });
    });

    socket.on("typing", function (data) {
      if (!data) return;

      if (data.type === "group") {
        const room = data.chat || data.receiver;
        if (room) socket.to(room).emit("typing", data);
        return;
      }

      const receiverSocketIds = Array.from(userSockets[data.receiver] || []);
      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit("typing", data);
      });
    });

    socket.on("message", function (data) {
      if (!data) return;

      if (getConversationType(data) === "group") {
        const room = data.chat || data.receiver;
        if (room) io.to(room).emit("message", data);
        return;
      }

      const receiverSocketIds = Array.from(userSockets[data.receiver] || []);
      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit("message", data);
      });
    });

    socket.on("messages-read", function (data) {
      if (!data?.sender || !data?.reader) return;

      const senderSocketIds = Array.from(userSockets[data.sender] || []);
      senderSocketIds.forEach((socketId) => {
        io.to(socketId).emit("messages-read", data);
      });
    });

    function emitMessageUpdate(eventName, data) {
      if (!data) return;

      if (getConversationType(data) === "group") {
        const room = data.chat || data.receiver || data.recname;
        if (room) socket.to(room).emit(eventName, data);
        return;
      }

      const participants = new Set(
        [data.sender, data.receiver, data.recname].filter(Boolean)
      );

      participants.forEach((username) => {
        const socketIds = Array.from(userSockets[username] || []);
        socketIds.forEach((socketId) => {
          io.to(socketId).emit(eventName, data);
        });
      });
    }

    socket.on("message-deleted", function (data) {
      emitMessageUpdate("message-deleted", data);
    });

    socket.on("message-reaction", function (data) {
      emitMessageUpdate("message-reaction", data);
    });

    socket.on("group", function (data) {
      const room = data?.room || data?.receiver;
      if (!room) return;

      socket.join(room);
      io.to(room).emit("message2", data);
    });
    socket.on("group:new", function (group) {
      if (group?._id) socket.broadcast.emit("group:new", group);
    });
    socket.on("status:new", function (status) {
      if (status?._id) socket.broadcast.emit("status:new", status);
    });
    socket.on("post:comment", function (data) {
      if (data?.post?._id) socket.broadcast.emit("post:comment", data);
    });
    socket.on("join-room", function (data) {
      const room = data?.room;
      if (!room) return;

      socket.join(room);
      socket.to(room).emit("room-presence", {
        room,
        user: data?.user || socket.data.username,
        status: "joined",
      });
    });
  socket.on("call-user", (data) => {
    if (data?.room) {
      socket.to(data.room).emit("incoming-call", {
        from: data.from,
        to: data.room,
        room: data.room,
        offer: data.offer,
        callType: data.callType || "video",
        callId: data.callId || "",
      });
      return;
    }

    const receiverSocketIds = Array.from(userSockets[data.to] || []);

    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("incoming-call", {
        from: data.from,
        to: data.to,
        offer: data.offer,
        callType: data.callType || "video",
        callId: data.callId || "",
      });
    });
  });

  socket.on("answer-call", (data) => {
    const callerSocketIds = Array.from(userSockets[data.to] || []);

    callerSocketIds.forEach((socketId) => {
      io.to(socketId).emit("call-answered", {
        from: data.from,
        answer: data.answer,
        callId: data.callId || "",
      });
    });
  });

  socket.on("ice-candidate", (data) => {
    if (data?.room) {
      socket.to(data.room).emit("ice-candidate", {
        from: data.from,
        room: data.room,
        candidate: data.candidate,
      });
      return;
    }

    const receiverSocketIds = Array.from(userSockets[data.to] || []);

    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("ice-candidate", {
        from: data.from,
        candidate: data.candidate,
      });
    });
  });

  socket.on("end-call", (data) => {
    if (data?.room) {
      socket.to(data.room).emit("call-ended", {
        from: data.from,
        room: data.room,
        callId: data.callId || "",
      });
      return;
    }

    const receiverSocketIds = Array.from(userSockets[data.to] || []);

    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("call-ended", {
        from: data.from,
        callId: data.callId || "",
      });
    });
  });

  function emitDirectLocationEvent(eventName, data) {
    const participants = new Set(
      [data?.sender, data?.receiver, data?.recname].filter(Boolean)
    );

    participants.forEach((username) => {
      const socketIds = Array.from(userSockets[username] || []);
      socketIds.forEach((socketId) => {
        if (socketId !== socket.id) {
          io.to(socketId).emit(eventName, data);
        }
      });
    });
  }

  socket.on("live-location:update", (data) => {
    if (!data?.sender) return;

    if (getConversationType(data) === "group") {
      const room = data.chat || data.receiver;
      if (room) socket.to(room).emit("live-location:update", data);
      return;
    }

    emitDirectLocationEvent("live-location:update", data);
  });

  socket.on("live-location:stop", (data) => {
    if (!data?.sender) return;

    if (getConversationType(data) === "group") {
      const room = data.chat || data.receiver;
      if (room) socket.to(room).emit("live-location:stop", data);
      return;
    }

    emitDirectLocationEvent("live-location:stop", data);
  });

  socket.on("disconnect", async function () {
    // your disconnect code
  });
    socket.on("disconnect", async function () {
      const username = socket.data.username;
      if (!username || !userSockets[username]) return;

      userSockets[username].delete(socket.id);

      if (userSockets[username].size > 0) {
        users[username] = Array.from(userSockets[username])[0];
        return;
      }

      delete userSockets[username];
      delete users[username];
      await setUserPresence(username, false, "");
      io.emit("presence", {
        username,
        status: false,
        displayname: "offline",
      });
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

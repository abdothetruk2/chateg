"use client";

import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import Cookies from "js-cookie";
import { store } from "../lib/store";
import { addGroup } from "../features/groups/groupSlice";
import { addStatus } from "../features/status/statusSlice";
import { clearUser, setUser } from "../features/user/userSlice";
import { socket } from "./socket";

function parseCookieUser() {
  const rawUser = Cookies.get("user");
  if (!rawUser) return null;

  const parsedUser = JSON.parse(rawUser);
  return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
}

function AuthBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const cookieUser = parseCookieUser();
      if (cookieUser?._id) {
        dispatch(setUser(cookieUser));
      } else {
        dispatch(clearUser());
      }
    } catch {
      Cookies.remove("user");
      dispatch(clearUser());
    }
  }, [dispatch]);

  return null;
}

function SocketReduxBridge() {
  const dispatch = useDispatch();

  useEffect(() => {
    function handleNewGroup(group) {
      if (group?._id) dispatch(addGroup(group));
    }

    function handleNewStatus(status) {
      if (status?._id) dispatch(addStatus(status));
    }

    socket.on("group:new", handleNewGroup);
    socket.on("status:new", handleNewStatus);

    return () => {
      socket.off("group:new", handleNewGroup);
      socket.off("status:new", handleNewStatus);
    };
  }, [dispatch]);

  return null;
}

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      <SocketReduxBridge />
      {children}
    </Provider>
  );
}

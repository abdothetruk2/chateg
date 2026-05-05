import { configureStore } from "@reduxjs/toolkit";
import groupReducer from "../features/groups/groupSlice";
import statusReducer from "../features/status/statusSlice";
import userReducer from "../features/user/userSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    groups: groupReducer,
    status: statusReducer,
  },
});

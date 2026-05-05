import { createSlice } from "@reduxjs/toolkit";

function getGroupId(group) {
  return String(group?._id || "");
}

const initialState = {
  groups: [],
  loading: false,
};

const groupSlice = createSlice({
  name: "groups",
  initialState,
  reducers: {
    setGroups(state, action) {
      state.groups = Array.isArray(action.payload) ? action.payload : [];
      state.loading = false;
    },
    addGroup(state, action) {
      const group = action.payload;
      const groupId = getGroupId(group);
      if (!groupId) return;

      const existingIndex = state.groups.findIndex(
        (item) => getGroupId(item) === groupId
      );

      if (existingIndex === -1) {
        state.groups.unshift(group);
      } else {
        state.groups[existingIndex] = group;
      }
    },
    updateGroup(state, action) {
      const group = action.payload;
      const groupId = getGroupId(group);
      if (!groupId) return;

      const existingIndex = state.groups.findIndex(
        (item) => getGroupId(item) === groupId
      );

      if (existingIndex === -1) {
        state.groups.unshift(group);
      } else {
        state.groups[existingIndex] = {
          ...state.groups[existingIndex],
          ...group,
        };
      }
    },
    removeGroup(state, action) {
      const groupId = String(action.payload || "");
      state.groups = state.groups.filter((group) => getGroupId(group) !== groupId);
    },
  },
});

export const { setGroups, addGroup, updateGroup, removeGroup } =
  groupSlice.actions;
export default groupSlice.reducer;

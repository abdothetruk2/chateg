import { createSlice } from "@reduxjs/toolkit";

function getStatusId(status) {
  return String(status?._id || "");
}

const initialState = {
  statuses: [],
  loading: false,
};

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {
    setStatuses(state, action) {
      state.statuses = Array.isArray(action.payload) ? action.payload : [];
      state.loading = false;
    },
    addStatus(state, action) {
      const status = action.payload;
      const statusId = getStatusId(status);
      if (!statusId) return;

      const existingIndex = state.statuses.findIndex(
        (item) => getStatusId(item) === statusId
      );

      if (existingIndex === -1) {
        state.statuses.unshift(status);
      } else {
        state.statuses[existingIndex] = status;
      }
    },
    removeStatus(state, action) {
      const statusId = String(action.payload || "");
      state.statuses = state.statuses.filter(
        (status) => getStatusId(status) !== statusId
      );
    },
  },
});

export const { setStatuses, addStatus, removeStatus } = statusSlice.actions;
export default statusSlice.reducer;

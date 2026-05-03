"use client";

import Cookies from "js-cookie";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock3,
  Filter,
  GripVertical,
  ListTodo,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  Tag,
  Target,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

const STORAGE_KEY = "egchat.todo.tasks";
const DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_NOW = Date.now();
const priorityOptions = ["Low", "Medium", "High"];
const priorityWeights = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const filterOptions = [
  { id: "all", title: "All" },
  { id: "active", title: "Active" },
  { id: "mine", title: "Mine" },
  { id: "due-soon", title: "Due soon" },
  { id: "overdue", title: "Overdue" },
  { id: "done", title: "Done" },
];

const sortOptions = [
  { id: "created", title: "Newest" },
  { id: "due", title: "Due date" },
  { id: "priority", title: "Priority" },
];

const columns = [
  {
    id: "todo",
    title: "Todo",
    icon: Circle,
    accent: "text-cyan-200",
  },
  {
    id: "progress",
    title: "Doing",
    icon: LoaderCircle,
    accent: "text-amber-200",
  },
  {
    id: "done",
    title: "Done",
    icon: CheckCircle2,
    accent: "text-emerald-200",
  },
];

const defaultTasks = [
  {
    id: "task-public-room",
    title: "Review public chat room",
    note: "Check that every member can read and send messages.",
    status: "todo",
    priority: "High",
    dueDate: toDateInputValue(new Date(INITIAL_NOW + DAY_MS * 2)),
    labels: ["Rooms", "QA"],
    checklist: [
      {
        id: "check-room-send",
        text: "Test member send flow",
        done: false,
      },
      {
        id: "check-room-media",
        text: "Confirm media attachments",
        done: false,
      },
    ],
    assigneeId: "",
    assigneeName: "",
    assigneeAvatar: "",
    estimateMinutes: 30,
    elapsedSeconds: 0,
    timerStartedAt: null,
    completedAt: null,
    createdAt: new Date(INITIAL_NOW).toISOString(),
  },
  {
    id: "task-profile-polish",
    title: "Polish profile flows",
    note: "Verify avatar, cover, and account settings.",
    status: "progress",
    priority: "Medium",
    dueDate: toDateInputValue(new Date(INITIAL_NOW + DAY_MS * 5)),
    labels: ["Profile"],
    checklist: [
      {
        id: "check-profile-avatar",
        text: "Upload avatar",
        done: true,
      },
      {
        id: "check-profile-cover",
        text: "Review cover layout",
        done: false,
      },
    ],
    assigneeId: "",
    assigneeName: "",
    assigneeAvatar: "",
    estimateMinutes: 45,
    elapsedSeconds: 0,
    timerStartedAt: null,
    completedAt: null,
    createdAt: new Date(INITIAL_NOW).toISOString(),
  },
  {
    id: "task-gradient",
    title: "Apply app gradient",
    note: "Keep the same color system across pages and panels.",
    status: "done",
    priority: "Low",
    dueDate: toDateInputValue(new Date(INITIAL_NOW - DAY_MS)),
    labels: ["Design"],
    checklist: [
      {
        id: "check-gradient-pages",
        text: "Check page backgrounds",
        done: true,
      },
      {
        id: "check-gradient-panels",
        text: "Check panel contrast",
        done: true,
      },
    ],
    assigneeId: "",
    assigneeName: "",
    assigneeAvatar: "",
    estimateMinutes: 20,
    elapsedSeconds: 0,
    timerStartedAt: null,
    completedAt: new Date(INITIAL_NOW).toISOString(),
    createdAt: new Date(INITIAL_NOW).toISOString(),
  },
];

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimestamp() {
  return Date.now();
}

function getCurrentUser() {
  try {
    const rawUser = Cookies.get("user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser);
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    return null;
  }
}

function normalizePerson(person, source = "User") {
  const id = String(person?._id || person?.id || "");
  if (!id) return null;

  return {
    id,
    name: person?.username || person?.name || person?.email || "User",
    avatar: person?.avatar || "/avatar.jpg",
    source,
  };
}

function mergePeople(people = []) {
  const map = new Map();

  people.forEach((person) => {
    if (!person?.id) return;
    if (!map.has(person.id) || person.source === "Friend") {
      map.set(person.id, person);
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.source !== b.source) return a.source === "Friend" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function parseLabels(value = []) {
  const source = Array.isArray(value) ? value.join(",") : String(value);
  const labels = source
    .split(/[,\n]/)
    .map((label) => label.trim().replace(/^#+/, "").replace(/\s+/g, " "))
    .filter(Boolean)
    .map((label) => label.slice(0, 24));

  return Array.from(new Set(labels)).slice(0, 6);
}

function normalizeChecklistItem(item, index = 0) {
  const text = typeof item === "string" ? item : item?.text || "";
  const cleanText = String(text).trim();

  if (!cleanText) return null;

  return {
    id:
      item?.id ||
      `check-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    text: cleanText,
    done: Boolean(item?.done),
    createdAt: item?.createdAt || new Date().toISOString(),
  };
}

function normalizeTask(task) {
  const status = task?.status || "todo";

  return {
    ...task,
    note: task?.note || "",
    priority: task?.priority || "Medium",
    status,
    dueDate: task?.dueDate || "",
    labels: parseLabels(task?.labels || task?.label || ""),
    checklist: Array.isArray(task?.checklist)
      ? task.checklist
          .map((item, index) => normalizeChecklistItem(item, index))
          .filter(Boolean)
      : [],
    assigneeId: task?.assigneeId || "",
    assigneeName: task?.assigneeName || "",
    assigneeAvatar: task?.assigneeAvatar || "",
    estimateMinutes: Number(task?.estimateMinutes) || 25,
    elapsedSeconds: Number(task?.elapsedSeconds) || 0,
    timerStartedAt: task?.timerStartedAt || null,
    completedAt:
      task?.completedAt || (status === "done" ? new Date().toISOString() : null),
    createdAt: task?.createdAt || new Date().toISOString(),
  };
}

function getAssigneeInitials(name = "") {
  const parts = name.trim().split(/\s+|[._-]+/).filter(Boolean);
  return (parts[0]?.[0] || "U").toUpperCase();
}

function getElapsedSeconds(task, timestamp = Date.now()) {
  const savedSeconds = Number(task?.elapsedSeconds) || 0;
  if (!task?.timerStartedAt) return savedSeconds;

  return savedSeconds + Math.max(0, Math.floor((timestamp - task.timerStartedAt) / 1000));
}

function formatDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getDateValueTime(value = "") {
  const [year, month, day] = String(value)
    .split("-")
    .map((part) => Number(part));

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day).getTime();
}

function formatShortDate(value = "") {
  const time = getDateValueTime(value);
  if (!time) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(time));
}

function getDueMeta(task, timestamp = Date.now()) {
  const dueTime = getDateValueTime(task?.dueDate);

  if (!dueTime) {
    return {
      label: "No date",
      tone: "neutral",
      daysAway: Infinity,
      sortTime: Infinity,
      isOverdue: false,
      isDueSoon: false,
    };
  }

  const todayTime = getDateValueTime(toDateInputValue(new Date(timestamp)));
  const daysAway = Math.round((dueTime - todayTime) / DAY_MS);
  const isDone = task?.status === "done";
  const isOverdue = !isDone && daysAway < 0;
  const isDueSoon = !isDone && daysAway >= 0 && daysAway <= 3;

  if (isDone) {
    return {
      label: `Due ${formatShortDate(task.dueDate)}`,
      tone: "done",
      daysAway,
      sortTime: dueTime,
      isOverdue: false,
      isDueSoon: false,
    };
  }

  if (isOverdue) {
    return {
      label:
        daysAway === -1
          ? "1 day late"
          : `${Math.abs(daysAway)} days late`,
      tone: "overdue",
      daysAway,
      sortTime: dueTime,
      isOverdue: true,
      isDueSoon: false,
    };
  }

  if (daysAway === 0) {
    return {
      label: "Today",
      tone: "today",
      daysAway,
      sortTime: dueTime,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  if (daysAway === 1) {
    return {
      label: "Tomorrow",
      tone: "soon",
      daysAway,
      sortTime: dueTime,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  if (daysAway <= 3) {
    return {
      label: `${daysAway} days left`,
      tone: "soon",
      daysAway,
      sortTime: dueTime,
      isOverdue: false,
      isDueSoon: true,
    };
  }

  return {
    label: `Due ${formatShortDate(task.dueDate)}`,
    tone: "neutral",
    daysAway,
    sortTime: dueTime,
    isOverdue: false,
    isDueSoon: false,
  };
}

function getChecklistStats(task) {
  const checklist = Array.isArray(task?.checklist) ? task.checklist : [];
  const done = checklist.filter((item) => item.done).length;

  return {
    done,
    total: checklist.length,
    percent:
      checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 0,
  };
}

function getStatusPatch(task, status) {
  return {
    status,
    completedAt:
      status === "done"
        ? task?.status === "done" && task?.completedAt
          ? task.completedAt
          : new Date().toISOString()
        : null,
  };
}

function compareTaskDates(a, b) {
  if (a === b) return 0;
  if (a === Infinity) return 1;
  if (b === Infinity) return -1;
  return a - b;
}

function sortTasks(tasks = [], mode = "created", timestamp = Date.now()) {
  return [...tasks].sort((a, b) => {
    const createdA = new Date(a.createdAt).getTime() || 0;
    const createdB = new Date(b.createdAt).getTime() || 0;

    if (mode === "due") {
      const dueCompare = compareTaskDates(
        getDueMeta(a, timestamp).sortTime,
        getDueMeta(b, timestamp).sortTime
      );

      if (dueCompare !== 0) return dueCompare;
      return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    }

    if (mode === "priority") {
      const priorityCompare =
        (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);

      if (priorityCompare !== 0) return priorityCompare;
      return compareTaskDates(
        getDueMeta(a, timestamp).sortTime,
        getDueMeta(b, timestamp).sortTime
      );
    }

    return createdB - createdA;
  });
}

function getDueToneClasses(tone = "neutral") {
  if (tone === "overdue") {
    return "border-red-300/25 bg-red-500/[0.12] text-red-100";
  }

  if (tone === "today") {
    return "border-amber-300/25 bg-amber-500/[0.12] text-amber-100";
  }

  if (tone === "soon") {
    return "border-cyan-300/25 bg-cyan-500/[0.12] text-cyan-100";
  }

  if (tone === "done") {
    return "border-emerald-300/25 bg-emerald-500/[0.12] text-emerald-100";
  }

  return "border-white/10 bg-black/20 text-slate-300";
}

export default function TodoPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [tasks, setTasks] = useState(() => defaultTasks.map(normalizeTask));
  const [people, setPeople] = useState([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [estimateMinutes, setEstimateMinutes] = useState(25);
  const [dueDate, setDueDate] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("created");
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activeTimerId, setActiveTimerId] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [now, setNow] = useState(INITIAL_NOW);
  const storageLoadedRef = useRef(false);

  useEffect(() => {
    window.setTimeout(() => {
      try {
        const savedTasks = window.localStorage.getItem(STORAGE_KEY);
        const nextTasks = savedTasks
          ? JSON.parse(savedTasks).map(normalizeTask)
          : defaultTasks.map(normalizeTask);
        const runningTask = nextTasks.find((task) => task.timerStartedAt);

        storageLoadedRef.current = true;
        setTasks(nextTasks);
        setActiveTimerId(runningTask?.id || "");
      } catch {
        storageLoadedRef.current = true;
        setTasks(defaultTasks.map(normalizeTask));
      }
    }, 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    window.setTimeout(async () => {
      try {
        const usersPromise = fetch("/api/users", { cache: "no-store" }).then(
          (res) => (res.ok ? res.json() : [])
        );

        const friendsPromise = currentUser?._id
          ? fetch("/api/friends", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ _id: currentUser._id }),
            }).then((res) => (res.ok ? res.json() : { friends: [] }))
          : Promise.resolve({ friends: [] });

        const [users, friendData] = await Promise.all([
          usersPromise,
          friendsPromise,
        ]);

        if (!mounted) return;

        const currentPerson = normalizePerson(currentUser, "You");
        const friends = (friendData?.friends || [])
          .map((person) => normalizePerson(person, "Friend"))
          .filter(Boolean);
        const allUsers = (Array.isArray(users) ? users : [])
          .map((person) => normalizePerson(person, "User"))
          .filter(Boolean);

        setPeople(mergePeople([currentPerson, ...friends, ...allUsers]));
      } catch (error) {
        console.error("Task people fetch failed:", error);
      }
    }, 0);

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!activeTimerId) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(getTimestamp());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeTimerId]);

  useEffect(() => {
    if (!storageLoadedRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [selectedTaskId, tasks]
  );

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const currentUserId = String(currentUser?._id || "");

    return sortTasks(
      tasks.filter((task) => {
        const dueMeta = getDueMeta(task, now);
        const checklistText = (task.checklist || [])
          .map((item) => item.text)
          .join(" ");
        const haystack =
          `${task.title} ${task.note} ${task.priority} ${task.assigneeName} ${
            task.dueDate
          } ${(task.labels || []).join(" ")} ${checklistText}`.toLowerCase();

        if (query && !haystack.includes(query)) return false;
        if (priorityFilter !== "All" && task.priority !== priorityFilter) {
          return false;
        }
        if (assigneeFilter === "unassigned" && task.assigneeId) return false;
        if (
          !["all", "unassigned"].includes(assigneeFilter) &&
          task.assigneeId !== assigneeFilter
        ) {
          return false;
        }

        if (taskFilter === "active") return task.status !== "done";
        if (taskFilter === "mine") {
          return Boolean(currentUserId) && task.assigneeId === currentUserId;
        }
        if (taskFilter === "due-soon") return dueMeta.isDueSoon;
        if (taskFilter === "overdue") return dueMeta.isOverdue;
        if (taskFilter === "done") return task.status === "done";

        return true;
      }),
      sortMode,
      now
    );
  }, [
    assigneeFilter,
    currentUser?._id,
    now,
    priorityFilter,
    search,
    sortMode,
    taskFilter,
    tasks,
  ]);

  function getAssigneePatch(personId) {
    const person = people.find((item) => item.id === personId);

    return {
      assigneeId: person?.id || "",
      assigneeName: person?.name || "",
      assigneeAvatar: person?.avatar || "",
    };
  }

  function openTask(taskId) {
    setSelectedTaskId(taskId);
    setNewChecklistItem("");
  }

  function closeTaskDrawer() {
    setSelectedTaskId("");
    setNewChecklistItem("");
  }

  function addTask(event) {
    event.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const timestamp = getTimestamp();

    setTasks((prev) => [
      {
        id: `task-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
        title: cleanTitle,
        note: note.trim(),
        status: "todo",
        priority,
        dueDate,
        labels: parseLabels(labelsInput),
        checklist: [],
        ...getAssigneePatch(assigneeId),
        estimateMinutes: Math.max(1, Number(estimateMinutes) || 25),
        elapsedSeconds: 0,
        timerStartedAt: null,
        completedAt: null,
        createdAt: new Date(timestamp).toISOString(),
      },
      ...prev,
    ]);
    setTitle("");
    setNote("");
    setPriority("Medium");
    setAssigneeId("");
    setEstimateMinutes(25);
    setDueDate("");
    setLabelsInput("");
  }

  function moveTask(taskId, status) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, ...getStatusPatch(task, status) } : task
      )
    );
  }

  function deleteTask(taskId) {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    if (selectedTaskId === taskId) closeTaskDrawer();
    if (activeTimerId === taskId) setActiveTimerId("");
  }

  function updateTask(taskId, patch) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const statusPatch = patch.status
          ? getStatusPatch(task, patch.status)
          : {};

        return { ...task, ...patch, ...statusPatch };
      })
    );
  }

  function addChecklistItem(event) {
    event.preventDefault();

    const text = newChecklistItem.trim();
    if (!selectedTask || !text) return;
    const timestamp = getTimestamp();

    updateTask(selectedTask.id, {
      checklist: [
        ...(selectedTask.checklist || []),
        {
          id: `check-${timestamp}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          text,
          done: false,
          createdAt: new Date(timestamp).toISOString(),
        },
      ],
    });
    setNewChecklistItem("");
  }

  function toggleChecklistItem(taskId, checklistItemId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      checklist: (task.checklist || []).map((item) =>
        item.id === checklistItemId ? { ...item, done: !item.done } : item
      ),
    });
  }

  function updateChecklistItem(taskId, checklistItemId, text) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      checklist: (task.checklist || []).map((item) =>
        item.id === checklistItemId ? { ...item, text } : item
      ),
    });
  }

  function deleteChecklistItem(taskId, checklistItemId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    updateTask(taskId, {
      checklist: (task.checklist || []).filter(
        (item) => item.id !== checklistItemId
      ),
    });
  }

  function startTimer(taskId) {
    const timestamp = getTimestamp();

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            elapsedSeconds: getElapsedSeconds(task, timestamp),
            timerStartedAt: timestamp,
          };
        }

        if (task.timerStartedAt) {
          return {
            ...task,
            elapsedSeconds: getElapsedSeconds(task, timestamp),
            timerStartedAt: null,
          };
        }

        return task;
      })
    );
    setNow(timestamp);
    setActiveTimerId(taskId);
  }

  function pauseTimer(taskId) {
    const timestamp = getTimestamp();

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              elapsedSeconds: getElapsedSeconds(task, timestamp),
              timerStartedAt: null,
            }
          : task
      )
    );
    setNow(timestamp);
    setActiveTimerId("");
  }

  function resetTimer(taskId) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, elapsedSeconds: 0, timerStartedAt: null }
          : task
      )
    );
    if (activeTimerId === taskId) setActiveTimerId("");
  }

  function handleDragStart(event, taskId) {
    setDraggingTaskId(taskId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }

  function handleDrop(event, status) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggingTaskId;
    if (taskId) moveTask(taskId, status);
    setDraggingTaskId("");
    setDragOverColumn("");
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const openTasks = totalTasks - doneTasks;
  const overdueTasks = tasks.filter((task) => getDueMeta(task, now).isOverdue)
    .length;
  const dueSoonTasks = tasks.filter((task) => getDueMeta(task, now).isDueSoon)
    .length;
  const trackedSeconds = tasks.reduce(
    (total, task) => total + getElapsedSeconds(task, now),
    0
  );
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const runningTask = tasks.find((task) => task.timerStartedAt);
  const selectedChecklistStats = selectedTask
    ? getChecklistStats(selectedTask)
    : { done: 0, total: 0, percent: 0 };

  return (
    <div className="app-shell grid min-h-screen grid-cols-1 pb-14 text-white lg:grid-cols-[4.5rem_1fr] lg:pb-0">
      <Sidebar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="app-page-header flex-col items-start gap-5 md:flex-row md:items-end">
          <div>
            <div className="app-kicker">
              <ListTodo className="h-4 w-4" />
              Workspace
            </div>
            <h1 className="app-page-title app-gradient-text">Tasks</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Team queue for rooms, fixes, and follow-ups.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-2xl lg:grid-cols-4">
            <div className="app-stat-card rounded-2xl px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                Open
              </p>
              <p className="text-2xl font-black text-white">{openTasks}</p>
              <p className="mt-1 text-xs font-bold text-cyan-100">
                {dueSoonTasks} due soon
              </p>
            </div>
            <div className="app-stat-card rounded-2xl px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                Done
              </p>
              <p className="text-2xl font-black text-emerald-200">
                {completionRate}%
              </p>
            </div>
            <div className="app-stat-card rounded-2xl px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                Overdue
              </p>
              <p className="text-2xl font-black text-red-100">{overdueTasks}</p>
            </div>
            <div className="app-stat-card rounded-2xl px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                Tracked
              </p>
              <p className="text-2xl font-black text-cyan-100">
                {Math.round(trackedSeconds / 60)}m
              </p>
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-3">
          <form
            onSubmit={addTask}
            className="app-panel grid gap-3 rounded-[1.75rem] p-4"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto]">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Task title"
                className="app-input min-h-12 rounded-2xl px-4 text-sm text-white outline-none placeholder:text-slate-400"
              />
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Short note"
                className="app-input min-h-12 rounded-2xl px-4 text-sm text-white outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!title.trim()}
                className="app-button-primary justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
              >
                {priorityOptions.map((value) => (
                  <option key={value} className="bg-slate-950" value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
              >
                <option className="bg-slate-950" value="">
                  Unassigned
                </option>
                {people.map((person) => (
                  <option
                    key={person.id}
                    className="bg-slate-950"
                    value={person.id}
                  >
                    {person.name}
                  </option>
                ))}
              </select>
              <input
                value={estimateMinutes}
                onChange={(event) => setEstimateMinutes(event.target.value)}
                min="1"
                type="number"
                placeholder="Min"
                className="app-input min-h-12 rounded-2xl px-4 text-sm text-white outline-none placeholder:text-slate-400"
              />
              <input
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
              />
              <input
                value={labelsInput}
                onChange={(event) => setLabelsInput(event.target.value)}
                placeholder="Labels"
                className="app-input min-h-12 rounded-2xl px-4 text-sm text-white outline-none placeholder:text-slate-400"
              />
            </div>
          </form>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="app-input flex min-h-12 items-center gap-2 rounded-2xl px-4">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setTaskFilter(filter.id)}
                  className={`inline-flex min-h-12 items-center justify-center rounded-2xl border px-3 text-sm font-bold transition ${
                    taskFilter === filter.id
                      ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {filter.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(18rem,24rem)]">
            <label className="app-input flex min-h-12 items-center gap-2 rounded-2xl px-4">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="w-full bg-transparent text-sm font-bold text-white outline-none"
              >
                <option className="bg-slate-950" value="All">
                  All priorities
                </option>
                {priorityOptions.map((value) => (
                  <option key={value} className="bg-slate-950" value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="app-input flex min-h-12 items-center gap-2 rounded-2xl px-4">
              <UserRound className="h-4 w-4 text-slate-400" />
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
                className="w-full bg-transparent text-sm font-bold text-white outline-none"
              >
                <option className="bg-slate-950" value="all">
                  All assignees
                </option>
                <option className="bg-slate-950" value="unassigned">
                  Unassigned
                </option>
                {people.map((person) => (
                  <option
                    key={person.id}
                    className="bg-slate-950"
                    value={person.id}
                  >
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="app-input flex min-h-12 items-center gap-2 rounded-2xl px-4">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="w-full bg-transparent text-sm font-bold text-white outline-none"
              >
                {sortOptions.map((option) => (
                  <option
                    key={option.id}
                    className="bg-slate-950"
                    value={option.id}
                  >
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
            {runningTask && (
              <button
                type="button"
                onClick={() => openTask(runningTask.id)}
                className="app-surface flex items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:-translate-y-0.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">
                    {runningTask.title}
                  </span>
                  <span className="text-xs text-cyan-100">Timer running</span>
                </span>
                <span className="font-mono text-sm text-cyan-100">
                  {formatDuration(getElapsedSeconds(runningTask, now))}
                </span>
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const Icon = column.icon;
            const columnTasks = filteredTasks.filter(
              (task) => task.status === column.id
            );
            const isDragOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragLeave={() => setDragOverColumn("")}
                onDrop={(event) => handleDrop(event, column.id)}
                className={`app-panel min-h-[24rem] rounded-[1.75rem] p-4 transition ${
                  isDragOver
                    ? "scale-[1.01] border-cyan-300/45 shadow-[0_24px_70px_rgba(34,211,238,0.14)]"
                    : ""
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08]">
                      <Icon className={`h-5 w-5 ${column.accent}`} />
                    </div>
                    <div>
                      <h2 className="font-black text-white">{column.title}</h2>
                      <p className="text-xs font-bold text-slate-400">
                        {columnTasks.length} tasks
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="rounded-[1.35rem] border border-dashed border-white/[0.12] bg-white/[0.035] px-4 py-8 text-center text-sm font-semibold text-slate-400">
                      Drop tasks here
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const elapsedSeconds = getElapsedSeconds(task, now);
                      const estimateSeconds =
                        Math.max(1, Number(task.estimateMinutes) || 25) * 60;
                      const timerProgress = Math.min(
                        100,
                        Math.round((elapsedSeconds / estimateSeconds) * 100)
                      );
                      const isTimerRunning = Boolean(task.timerStartedAt);
                      const dueMeta = getDueMeta(task, now);
                      const checklistStats = getChecklistStats(task);

                      return (
                        <article
                          key={task.id}
                          draggable
                          onClick={() => openTask(task.id)}
                          onDragStart={(event) => handleDragStart(event, task.id)}
                          onDragEnd={() => {
                            setDraggingTaskId("");
                            setDragOverColumn("");
                          }}
                          className={`group cursor-grab rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/10 transition active:cursor-grabbing ${
                            draggingTaskId === task.id
                              ? "scale-95 opacity-55 ring-2 ring-cyan-300/45"
                              : "hover:-translate-y-1 hover:bg-white/[0.075]"
                          } ${task.status === "done" ? "opacity-80" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <h3
                                  className={`break-words font-black text-white ${
                                    task.status === "done"
                                      ? "text-slate-400 line-through decoration-emerald-300/50"
                                      : ""
                                  }`}
                                >
                                  {task.title}
                                </h3>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                    task.priority === "High"
                                      ? "border-red-300/25 bg-red-500/[0.12] text-red-100"
                                      : task.priority === "Medium"
                                      ? "border-amber-300/25 bg-amber-500/[0.12] text-amber-100"
                                      : "border-emerald-300/25 bg-emerald-500/[0.12] text-emerald-100"
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              </div>
                              {task.note && (
                                <p className="mt-2 break-words text-sm leading-6 text-slate-300">
                                  {task.note}
                                </p>
                              )}

                              {(task.labels || []).length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {(task.labels || []).slice(0, 4).map((label) => (
                                    <span
                                      key={label}
                                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[11px] font-bold text-slate-300"
                                    >
                                      <Tag className="h-3 w-3 text-cyan-200" />
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-slate-200">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300/15 text-[10px] text-cyan-100">
                                    {task.assigneeName
                                      ? getAssigneeInitials(task.assigneeName)
                                      : <UserRound className="h-3 w-3" />}
                                  </span>
                                  {task.assigneeName || "Unassigned"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-xs text-cyan-100">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {formatDuration(elapsedSeconds)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${getDueToneClasses(
                                    dueMeta.tone
                                  )}`}
                                >
                                  {dueMeta.isOverdue ? (
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  ) : (
                                    <CalendarDays className="h-3.5 w-3.5" />
                                  )}
                                  {dueMeta.label}
                                </span>
                                {checklistStats.total > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs font-bold text-emerald-100">
                                    <CheckSquare className="h-3.5 w-3.5" />
                                    {checklistStats.done}/{checklistStats.total}
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full bg-cyan-300 transition-[width]"
                                  style={{ width: `${timerProgress}%` }}
                                />
                              </div>
                              {checklistStats.total > 0 && (
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-emerald-300 transition-[width]"
                                    style={{ width: `${checklistStats.percent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col gap-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveTask(
                                    task.id,
                                    task.status === "done" ? "todo" : "done"
                                  );
                                }}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-emerald-300/[0.12] hover:text-emerald-100"
                                title={
                                  task.status === "done"
                                    ? "Reopen task"
                                    : "Mark done"
                                }
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (isTimerRunning) pauseTimer(task.id);
                                  else startTimer(task.id);
                                }}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-cyan-300/[0.12] hover:text-cyan-100"
                                title={isTimerRunning ? "Pause timer" : "Start timer"}
                              >
                                {isTimerRunning ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                className="rounded-xl p-2 text-slate-500 opacity-0 transition hover:bg-red-500/[0.12] hover:text-red-200 group-hover:opacity-100"
                                title="Delete task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close task drawer"
              className="absolute inset-0 cursor-default"
              onClick={closeTaskDrawer}
            />

            <aside className="app-panel relative z-10 flex h-full w-full max-w-sm flex-col overflow-hidden rounded-l-[1.75rem] border-l border-white/10">
              <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Task
                  </p>
                  <h2 className="text-lg font-black text-white">Details</h2>
                </div>
                <button
                  type="button"
                  onClick={closeTaskDrawer}
                  className="app-icon-button rounded-2xl p-2"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="thin-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Title
                  </label>
                  <input
                    value={selectedTask.title}
                    onChange={(event) =>
                      updateTask(selectedTask.id, { title: event.target.value })
                    }
                    className="app-input min-h-12 rounded-2xl px-4 text-sm text-white outline-none"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Note
                  </label>
                  <textarea
                    value={selectedTask.note}
                    onChange={(event) =>
                      updateTask(selectedTask.id, { note: event.target.value })
                    }
                    rows={4}
                    className="app-input resize-none rounded-2xl px-4 py-3 text-sm leading-6 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Status
                    </label>
                    <select
                      value={selectedTask.status}
                      onChange={(event) =>
                        updateTask(selectedTask.id, { status: event.target.value })
                      }
                      className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
                    >
                      {columns.map((column) => (
                        <option
                          key={column.id}
                          className="bg-slate-950"
                          value={column.id}
                        >
                          {column.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Priority
                    </label>
                    <select
                      value={selectedTask.priority}
                      onChange={(event) =>
                        updateTask(selectedTask.id, { priority: event.target.value })
                      }
                      className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
                    >
                      {priorityOptions.map((value) => (
                        <option key={value} className="bg-slate-950" value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Due
                    </label>
                    <input
                      value={selectedTask.dueDate || ""}
                      type="date"
                      onChange={(event) =>
                        updateTask(selectedTask.id, {
                          dueDate: event.target.value,
                        })
                      }
                      className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Labels
                    </label>
                    <input
                      key={`${selectedTask.id}-labels`}
                      defaultValue={(selectedTask.labels || []).join(", ")}
                      onBlur={(event) =>
                        updateTask(selectedTask.id, {
                          labels: parseLabels(event.target.value),
                        })
                      }
                      className="app-input min-h-12 rounded-2xl px-4 text-sm text-white outline-none placeholder:text-slate-400"
                      placeholder="Design, QA"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Assign
                  </label>
                  <select
                    value={selectedTask.assigneeId}
                    onChange={(event) =>
                      updateTask(selectedTask.id, getAssigneePatch(event.target.value))
                    }
                    className="app-input min-h-12 rounded-2xl px-4 text-sm font-bold text-white outline-none"
                  >
                    <option className="bg-slate-950" value="">
                      Unassigned
                    </option>
                    {people.map((person) => (
                      <option
                        key={person.id}
                        className="bg-slate-950"
                        value={person.id}
                      >
                        {person.name} · {person.source}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="app-section-card rounded-[1.5rem] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-white">
                          {formatDuration(getElapsedSeconds(selectedTask, now))}
                        </p>
                        <p className="text-xs text-slate-400">
                          {selectedTask.timerStartedAt ? "Running" : "Paused"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-1 text-right">
                      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Minutes
                      </label>
                      <input
                        value={selectedTask.estimateMinutes}
                        min="1"
                        type="number"
                        onChange={(event) =>
                          updateTask(selectedTask.id, {
                            estimateMinutes: Math.max(
                              1,
                              Number(event.target.value) || 1
                            ),
                          })
                        }
                        className="app-input h-10 w-20 rounded-xl px-3 text-right text-sm font-bold text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {selectedTask.timerStartedAt ? (
                      <button
                        type="button"
                        onClick={() => pauseTimer(selectedTask.id)}
                        className="app-button-secondary flex-1 justify-center px-4 py-3"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startTimer(selectedTask.id)}
                        className="app-button-primary flex-1 justify-center px-4 py-3"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => resetTimer(selectedTask.id)}
                      className="app-icon-button rounded-2xl p-3"
                      title="Reset timer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="app-section-card rounded-[1.5rem] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-cyan-200" />
                      <h3 className="text-sm font-black text-white">
                        Checklist
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-100">
                      {selectedChecklistStats.done}/{selectedChecklistStats.total}
                    </span>
                  </div>

                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-300 transition-[width]"
                      style={{ width: `${selectedChecklistStats.percent}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    {(selectedTask.checklist || []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.035] px-3 py-4 text-center text-sm font-semibold text-slate-400">
                        No checklist items
                      </div>
                    ) : (
                      selectedTask.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-2 py-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleChecklistItem(selectedTask.id, item.id)
                            }
                            className="rounded-xl p-1.5 text-emerald-100 transition hover:bg-emerald-300/10"
                            title={item.done ? "Mark open" : "Mark complete"}
                          >
                            {item.done ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                          <input
                            value={item.text}
                            onChange={(event) =>
                              updateChecklistItem(
                                selectedTask.id,
                                item.id,
                                event.target.value
                              )
                            }
                            className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                              item.done
                                ? "text-slate-500 line-through decoration-emerald-300/50"
                                : "text-white"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              deleteChecklistItem(selectedTask.id, item.id)
                            }
                            className="rounded-xl p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-200"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={addChecklistItem} className="mt-3 flex gap-2">
                    <input
                      value={newChecklistItem}
                      onChange={(event) => setNewChecklistItem(event.target.value)}
                      placeholder="Add checklist item"
                      className="app-input min-h-11 min-w-0 flex-1 rounded-2xl px-4 text-sm text-white outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!newChecklistItem.trim()}
                      className="app-icon-button rounded-2xl p-3 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Add item"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>
                </div>

                <div className="app-section-card rounded-[1.5rem] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-sm font-black text-white">People</h3>
                  </div>
                  <div className="space-y-2">
                    {people.slice(0, 6).map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() =>
                          updateTask(selectedTask.id, getAssigneePatch(person.id))
                        }
                        className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition hover:bg-white/10 ${
                          selectedTask.assigneeId === person.id
                            ? "border-cyan-300/35 bg-cyan-300/15"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-black text-cyan-100">
                            {getAssigneeInitials(person.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-white">
                              {person.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {person.source}
                            </span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

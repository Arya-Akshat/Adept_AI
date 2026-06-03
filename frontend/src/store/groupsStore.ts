import { create } from "zustand";
import { Group, Student } from "@/types/groups";
import { groupsApi } from "@/lib/api";

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  students: Student[];
  currentStudent: Student | null;
  totalStudents: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchGroups: () => Promise<void>;
  createGroup: (data: {
    name: string;
    subject: string;
    grade: string;
    academicYear: string;
    subjectColumns?: string[];
  }) => Promise<Group>;
  updateGroup: (
    id: string,
    data: {
      name?: string;
      subject?: string;
      grade?: string;
      academicYear?: string;
      subjectColumns?: string[];
    }
  ) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;

  fetchStudents: (
    groupId: string,
    params?: { search?: string; page?: number; limit?: number }
  ) => Promise<void>;
  fetchStudent: (groupId: string, sid: string) => Promise<Student>;
  addStudent: (
    groupId: string,
    data: {
      name: string;
      rollNumber: string;
      email?: string;
      phone?: string;
    }
  ) => Promise<Student>;
  updateStudent: (
    groupId: string,
    sid: string,
    data: {
      name?: string;
      rollNumber?: string;
      email?: string;
      phone?: string;
      overallRemark?: string;
      attendancePercent?: number | null;
      academicHistory?: {
        columnName: string;
        marks: number;
        totalMarks: number;
        remarks?: string;
      }[];
    }
  ) => Promise<Student>;
  deleteStudent: (groupId: string, sid: string) => Promise<void>;

  setCurrentGroup: (group: Group | null) => void;
  setCurrentStudent: (student: Student | null) => void;
  clearCurrentGroup: () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  currentGroup: null,
  students: [],
  currentStudent: null,
  totalStudents: 0,
  loading: false,
  error: null,

  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.listGroups();
      set({ groups: response.data.data.groups, loading: false });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to fetch groups";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  createGroup: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.createGroup(data);
      const newGroup = response.data.data.group;
      set((state) => ({
        groups: [newGroup, ...state.groups],
        loading: false,
      }));
      return newGroup;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to create group";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  updateGroup: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.updateGroup(id, data);
      const updatedGroup = response.data.data.group;
      set((state) => ({
        groups: state.groups.map((g) => (g._id === id ? updatedGroup : g)),
        currentGroup: state.currentGroup?._id === id ? updatedGroup : state.currentGroup,
        loading: false,
      }));
      return updatedGroup;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to update group";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  deleteGroup: async (id) => {
    set({ loading: true, error: null });
    try {
      await groupsApi.deleteGroup(id);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== id),
        currentGroup: state.currentGroup?._id === id ? null : state.currentGroup,
        loading: false,
      }));
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to delete group";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  fetchStudents: async (groupId, params) => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.listStudents(groupId, params);
      const { students, total } = response.data.data;
      set({ students, totalStudents: total, loading: false });
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to fetch students";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  fetchStudent: async (groupId, sid) => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.getStudent(groupId, sid);
      const student = response.data.data.student;
      set({ currentStudent: student, loading: false });
      return student;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to fetch student details";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  addStudent: async (groupId, data) => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.addStudent(groupId, data);
      const newStudent = response.data.data.student;
      set((state) => ({
        students: [...state.students, newStudent].sort((a, b) =>
          a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true, sensitivity: "base" })
        ),
        totalStudents: state.totalStudents + 1,
        loading: false,
      }));
      return newStudent;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to add student";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  updateStudent: async (groupId, sid, data) => {
    set({ loading: true, error: null });
    try {
      const response = await groupsApi.updateStudent(groupId, sid, data);
      const updatedStudent = response.data.data.student;
      set((state) => ({
        students: state.students.map((s) => (s._id === sid ? updatedStudent : s)),
        currentStudent: state.currentStudent?._id === sid ? updatedStudent : state.currentStudent,
        loading: false,
      }));
      return updatedStudent;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to update student";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  deleteStudent: async (groupId, sid) => {
    set({ loading: true, error: null });
    try {
      await groupsApi.deleteStudent(groupId, sid);
      set((state) => ({
        students: state.students.filter((s) => s._id !== sid),
        currentStudent: state.currentStudent?._id === sid ? null : state.currentStudent,
        totalStudents: Math.max(0, state.totalStudents - 1),
        loading: false,
      }));
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || "Failed to delete student";
      set({ error: errMsg, loading: false });
      throw err;
    }
  },

  setCurrentGroup: (group) => set({ currentGroup: group }),
  setCurrentStudent: (student) => set({ currentStudent: student }),
  clearCurrentGroup: () => set({ currentGroup: null, students: [], totalStudents: 0 }),
}));

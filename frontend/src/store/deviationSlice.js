import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { processChat, extractDocument, saveDeviation, listDeviations } from "../api/api";

// The backend conversation history only cares about text turns; a file
// upload is summarized as a short text stand-in so context isn't lost.
function toApiConversation(conversation) {
  return conversation.map((m) => ({
    role: m.role,
    content: m.type === "file" ? `[Uploaded file: ${m.fileName}]` : m.content,
  }));
}

const emptyForm = {
  sitePlant: "",
  dateOfOccurrence: "",
  titleShortDescription: "",
  source: "",
  relatedProductMaterial: "",
  batchLotNumber: "",
  detailedDescription: "",
  initialImpact: "",
  initialSeverity: "",
  additionalFields: [],
};

const emptyRisk = {
  severityClassification: null,
  rootCauseHypothesis: "",
  nextQaActions: "",
  regulatoryQualityImpact: "",
  nextStepsAndAssurance: "",
};

const initialState = {
  deviationId: null,
  formData: { ...emptyForm },
  riskAssessment: { ...emptyRisk },
  changedFields: [],
  conversation: [
    {
      role: "assistant",
      type: "text",
      content:
        "Upload a deviation report, paste event details, or describe what happened. I will structure the record and suggest initial impact and severity for your review.",
    },
  ],
  chatStatus: "idle", // idle | loading | error
  chatError: null,
  pendingAction: null, // null | "chat" | "document" -- drives the loading bubble's copy
  saveStatus: "idle", // idle | loading | saved | error
  saveError: null,
  savedDeviations: [],
  savedDeviationsStatus: "idle",
  savedDeviationsError: null,
  resetBackup: null,
};

// Tool 1 (log) & Tool 2 (edit) share one thunk -- same endpoint, the backend
// decides log-vs-edit based on whether formData already has values.
export const sendChatMessage = createAsyncThunk(
  "deviation/sendChatMessage",
  async (message, { getState, rejectWithValue }) => {
    const state = getState().deviation;
    try {
      const res = await processChat({
        message,
        conversation: toApiConversation(state.conversation),
        currentFormData: state.formData,
        currentRiskAssessment: state.riskAssessment,
        deviationId: state.deviationId,
      });
      return res;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.detail || err.message);
    }
  }
);

// Tool 3: document / PDF / email extraction
export const uploadDeviationDocument = createAsyncThunk(
  "deviation/uploadDeviationDocument",
  async (file, { rejectWithValue }) => {
    try {
      const res = await extractDocument(file);
      return res;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.detail || err.message);
    }
  }
);

export const persistDeviation = createAsyncThunk(
  "deviation/persistDeviation",
  async (_, { getState, rejectWithValue }) => {
    const state = getState().deviation;
    try {
      const res = await saveDeviation({
        deviationId: state.deviationId,
        formData: state.formData,
        riskAssessment: state.riskAssessment,
        conversation: toApiConversation(state.conversation),
      });
      return res;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.detail || err.message);
    }
  }
);

export const loadSavedDeviations = createAsyncThunk(
  "deviation/loadSavedDeviations",
  async (_, { rejectWithValue }) => {
    try {
      return await listDeviations();
    } catch (err) {
      return rejectWithValue(err?.response?.data?.detail || err.message);
    }
  }
);

const deviationSlice = createSlice({
  name: "deviation",
  initialState,
  reducers: {
    resetDeviation: (state) => {
      const hasFormData = Object.entries(state.formData).some(([key, value]) => (
        key === "additionalFields" ? value.length > 0 : typeof value === "string" && value.trim() !== ""
      ));
      const hasUserMessages = state.conversation.some((message) => message.role === "user");
      if (!hasFormData && !hasUserMessages) return;

      state.resetBackup = {
        deviationId: state.deviationId,
        formData: {
          ...state.formData,
          additionalFields: state.formData.additionalFields.map((field) => ({ ...field })),
        },
        riskAssessment: { ...state.riskAssessment },
        changedFields: [...state.changedFields],
        conversation: state.conversation.map((message) => ({ ...message })),
        chatStatus: state.chatStatus,
        chatError: state.chatError,
        pendingAction: null,
        saveStatus: state.saveStatus,
        saveError: state.saveError,
      };
      state.deviationId = null;
      state.formData = { ...emptyForm, additionalFields: [] };
      state.riskAssessment = { ...emptyRisk };
      state.changedFields = [];
      state.conversation = initialState.conversation.map((message) => ({ ...message }));
      state.chatStatus = "idle";
      state.chatError = null;
      state.pendingAction = null;
      state.saveStatus = "idle";
      state.saveError = null;
    },
    undoReset: (state) => {
      if (!state.resetBackup) return;
      Object.assign(state, state.resetBackup);
      state.resetBackup = null;
    },
    openSavedDeviation: (state, action) => {
      const record = action.payload;
      state.deviationId = record.id;
      state.formData = { ...emptyForm, ...record.formData };
      state.riskAssessment = { ...emptyRisk, ...record.riskAssessment };
      state.changedFields = [];
      state.conversation = [
        ...initialState.conversation.map((message) => ({ ...message })),
        {
          role: "assistant",
          type: "text",
          content: "Saved deviation loaded. You can review the record and continue with follow-up details in chat.",
        },
      ];
      state.chatStatus = "idle";
      state.chatError = null;
      state.pendingAction = null;
      state.saveStatus = "saved";
      state.saveError = null;
      state.resetBackup = null;
    },
    updateFormField: (state, action) => {
      const { field, value } = action.payload;
      if (field in state.formData) state.formData[field] = value;
      state.saveStatus = "idle";
      state.saveError = null;
    },
    updateAdditionalField: (state, action) => {
      const { index, value } = action.payload;
      if (state.formData.additionalFields[index]) state.formData.additionalFields[index].value = value;
      state.saveStatus = "idle";
      state.saveError = null;
    },
    updateRiskField: (state, action) => {
      const { field, value } = action.payload;
      if (field in state.riskAssessment) state.riskAssessment[field] = value;
      state.saveStatus = "idle";
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- chat (log / edit) ---
      .addCase(sendChatMessage.pending, (state, action) => {
        state.resetBackup = null;
        state.saveStatus = "idle";
        state.saveError = null;
        state.chatStatus = "loading";
        state.chatError = null;
        state.pendingAction = "chat";
        state.conversation.push({ role: "user", type: "text", content: action.meta.arg });
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatStatus = "idle";
        state.pendingAction = null;
        state.formData = action.payload.formData;
        state.riskAssessment = action.payload.riskAssessment;
        state.changedFields = action.payload.changedFields || [];
        state.conversation.push({ role: "assistant", type: "text", content: action.payload.reply });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.chatStatus = "error";
        state.pendingAction = null;
        state.chatError = action.payload || "Something went wrong.";
        state.conversation.push({
          role: "assistant",
          type: "text",
          content: `⚠️ ${state.chatError}`,
        });
      })
      // --- document extraction ---
      .addCase(uploadDeviationDocument.pending, (state, action) => {
        state.resetBackup = null;
        state.saveStatus = "idle";
        state.saveError = null;
        state.chatStatus = "loading";
        state.chatError = null;
        state.pendingAction = "document";
        state.conversation.push({
          role: "user",
          type: "file",
          fileName: action.meta.arg.name,
          fileKind: action.meta.arg.name.toLowerCase().endsWith(".pdf") ? "PDF Document" : "Text Document",
        });
      })
      .addCase(uploadDeviationDocument.fulfilled, (state, action) => {
        state.chatStatus = "idle";
        state.pendingAction = null;
        state.formData = action.payload.formData;
        state.riskAssessment = action.payload.riskAssessment;
        state.changedFields = action.payload.changedFields || [];
        state.conversation.push({ role: "assistant", type: "text", content: action.payload.reply });
      })
      .addCase(uploadDeviationDocument.rejected, (state, action) => {
        state.chatStatus = "error";
        state.pendingAction = null;
        state.chatError = action.payload || "Could not process the document.";
        state.conversation.push({
          role: "assistant",
          type: "text",
          content: `⚠️ ${state.chatError}`,
        });
      })
      // --- save ---
      .addCase(persistDeviation.pending, (state) => {
        state.resetBackup = null;
        state.saveStatus = "loading";
        state.saveError = null;
      })
      .addCase(persistDeviation.fulfilled, (state, action) => {
        state.saveStatus = "saved";
        state.deviationId = action.payload.id;
        state.savedDeviations = [
          action.payload,
          ...state.savedDeviations.filter((record) => record.id !== action.payload.id),
        ];
      })
      .addCase(persistDeviation.rejected, (state, action) => {
        state.saveStatus = "error";
        state.saveError = action.payload || "Could not save.";
      })
      .addCase(loadSavedDeviations.pending, (state) => {
        state.savedDeviationsStatus = "loading";
        state.savedDeviationsError = null;
      })
      .addCase(loadSavedDeviations.fulfilled, (state, action) => {
        state.savedDeviationsStatus = "idle";
        state.savedDeviations = action.payload;
      })
      .addCase(loadSavedDeviations.rejected, (state, action) => {
        state.savedDeviationsStatus = "error";
        state.savedDeviationsError = action.payload || "Could not load saved deviations.";
      });
  },
});

export const { resetDeviation, undoReset, openSavedDeviation, updateFormField, updateAdditionalField, updateRiskField } = deviationSlice.actions;
export default deviationSlice.reducer;

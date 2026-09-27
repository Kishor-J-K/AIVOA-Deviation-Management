import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadSavedDeviations,
  openSavedDeviation,
  persistDeviation,
  resetDeviation,
  undoReset,
} from "../../store/deviationSlice";
import RiskAssessmentSection from "./RiskAssessmentCard";

const SECTIONS = [
  {
    id: "information",
    number: 1,
    title: "DEVIATION INFORMATION",
    fields: [
      { key: "sitePlant", label: "Site / Plant", placeholder: "e.g. API Manufacturing Unit", required: true },
      { key: "dateOfOccurrence", label: "Date of Occurrence", placeholder: "dd-mm-yyyy", required: true },
      { key: "titleShortDescription", label: "Title / Short Description", placeholder: "e.g. OOS result for Assay in Batch ABC-001", required: true },
      { key: "source", label: "Source", placeholder: "Select source", required: true, options: ["Operator observation", "In-process test", "Equipment alarm", "Laboratory result", "Audit finding", "Material discrepancy", "Other"] },
      { key: "relatedProductMaterial", label: "Related Product / Material", placeholder: "Search product or material…" },
      { key: "batchLotNumber", label: "Batch / Lot Number", placeholder: "Enter batch / lot number…" },
    ],
  },
  {
    id: "details",
    number: 2,
    title: "DEVIATION DETAILS",
    fields: [
      { key: "detailedDescription", label: "Detailed Description", placeholder: "Describe what happened, where, when, and how it was detected…", required: true, multiline: true, wide: true },
      { key: "initialImpact", label: "Initial Impact", placeholder: "Describe the known or potential impact…", multiline: true },
      { key: "initialSeverity", label: "Initial Severity", placeholder: "Select severity", options: ["Critical", "Major", "Minor"] },
    ],
  },
];

function getSections(formData) {
  return SECTIONS.map((section) => {
    const fields = section.fields.map((field) => ({ ...field, value: formData[field.key] }));
    const additionalFields = (formData.additionalFields || [])
      .map((field, index) => ({ ...field, index }))
      .filter((field) => field.section === section.id)
      .map((field) => ({
        key: `extra-${field.index}`,
        label: field.label,
        value: field.value,
        placeholder: "Enter deviation detail…",
        additionalIndex: field.index,
      }));
    return { ...section, fields: [...fields, ...additionalFields] };
  });
}

function StatusBadge({ hasData, saved, hasSeverity }) {
  if (saved) {
    return (
      <span className="status-badge status-badge--ready">
        <span className="status-badge__dot" /> Saved
      </span>
    );
  }
  if (hasData && hasSeverity) {
    return <span className="status-badge status-badge--ready"><span className="status-badge__dot" /> Ready to Review</span>;
  }
  return <span className="status-badge status-badge--pending">Draft</span>;
}

function Field({ field, value, changed, onChange }) {
  const availableOptions = field.options && value && !field.options.includes(value)
    ? [...field.options, value]
    : field.options;
  return (
    <label className={`field ${field.wide ? "field--wide" : ""} ${changed ? "field--flash" : ""}`}>
      <span className="field__label">{field.label}{field.required ? " *" : ""}</span>
      {field.multiline ? (
        <textarea className="field__input field__textarea" value={value || ""} placeholder={field.placeholder} disabled readOnly rows={field.key === "detailedDescription" ? 4 : 2} />
      ) : availableOptions ? (
        <select className="field__input" value={value || ""} disabled>
          <option value="" disabled>{field.placeholder}</option>
          {availableOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          className="field__input"
          type="text"
          value={value || ""}
          placeholder={field.placeholder}
          disabled
          readOnly
          title="AI-populated field. Add or correct details using the assistant."
        />
      )}
    </label>
  );
}

function SectionHeading({ number, title }) {
  return (
    <div className="section-heading">
      <span className="section-heading__num">{number}.</span> {title}
    </div>
  );
}

export default function DeviationForm() {
  const dispatch = useDispatch();
  const {
    formData,
    changedFields,
    riskAssessment,
    saveStatus,
    saveError,
    resetBackup,
    chatStatus,
    savedDeviations,
    savedDeviationsStatus,
    savedDeviationsError,
    deviationId,
  } = useSelector((s) => s.deviation);
  const [folderOpen, setFolderOpen] = useState(false);
  const canSave = Boolean(formData.titleShortDescription && formData.detailedDescription) && saveStatus !== "loading";
  const sections = getSections(formData);

  useEffect(() => {
    dispatch(loadSavedDeviations());
  }, [dispatch]);

  return (
    <div className="deviation-form">
      <div className="panel-heading">
        <div>
          <h2>Log Deviation</h2>
          <p className="panel-heading__subtitle">Record an unexpected event, out-of-specification result or non-conformance.</p>
        </div>
        <StatusBadge hasData={Boolean(formData.titleShortDescription)} saved={saveStatus === "saved"} hasSeverity={Boolean(formData.initialSeverity)} />
      </div>

      {sections.map((section) => (
        <div key={section.id}>
          <SectionHeading number={section.number} title={section.title} />
          <div className="field-grid">
            {section.fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={field.value}
                changed={changedFields.includes(field.key) || changedFields.includes("additionalFields")}
              />
            ))}
          </div>
        </div>
      ))}

      <RiskAssessmentSection />

      <div className="commit-area">
        {resetBackup ? (
          <button className="btn btn--reset" onClick={() => dispatch(undoReset())}>Undo Reset</button>
        ) : (
          <button className="btn btn--reset" disabled={saveStatus === "loading" || chatStatus === "loading"} onClick={() => dispatch(resetDeviation())}>Reset Form</button>
        )}
        <button className="btn btn--commit" disabled={!canSave} onClick={() => dispatch(persistDeviation())}>
          {saveStatus === "loading" ? "Saving…" : "Save Deviation"}
        </button>
        {saveStatus === "error" && <span className="save-status save-status--error">{saveError || "Save failed."}</span>}
      </div>

      <section className="saved-deviations">
        <button
          type="button"
          className="saved-deviations__toggle"
          aria-expanded={folderOpen}
          onClick={() => setFolderOpen((open) => !open)}
        >
          <span>Saved Deviations</span>
          <span className="saved-deviations__count">{savedDeviations.length}</span>
          <span className="saved-deviations__chevron">{folderOpen ? "−" : "+"}</span>
        </button>
        {folderOpen && (
          <div className="saved-deviations__contents">
            {savedDeviationsStatus === "loading" && <p className="saved-deviations__empty">Loading saved deviations…</p>}
            {savedDeviationsStatus === "error" && <p className="saved-deviations__empty">{savedDeviationsError}</p>}
            {savedDeviationsStatus !== "loading" && savedDeviationsStatus !== "error" && savedDeviations.length === 0 && (
              <p className="saved-deviations__empty">Saved deviation records will appear here.</p>
            )}
            {savedDeviations.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`saved-deviation ${record.id === deviationId ? "saved-deviation--active" : ""}`}
                onClick={() => dispatch(openSavedDeviation(record))}
              >
                <span className="saved-deviation__title">{record.formData.titleShortDescription || "Untitled deviation"}</span>
                <span className="saved-deviation__meta">
                  {[record.formData.sitePlant, record.formData.batchLotNumber].filter(Boolean).join(" · ") || "Site and batch not provided"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

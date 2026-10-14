import React, { useState, useEffect } from "react";
import { documentsApi } from "../../../services/api/documentsApi";
import { getErrorMessage } from "../../../services/api/client";
import Button from "../../../components/Button";
import FormField from "../../../components/FormField";
import Modal from "../../../components/Modal";
import Badge from "../../../components/Badge";
import LoadingState from "../../../components/LoadingState";
import EmptyState from "../../../components/EmptyState";
import { FileText, Plus, Trash2, AlertTriangle } from "lucide-react";

const TYPE_LABELS = {
  passport: "Passport",
  visa: "Visa",
  insurance: "Travel Insurance",
  other: "Other",
};

const STATUS_BADGE = {
  expired: { variant: "dark", text: "Expired" },
  expiring_soon: { variant: "terracotta", text: "Expiring soon" },
  ok: { variant: "forest", text: "Valid" },
};

export const TripDocumentsTab = ({ trip }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    type: "passport",
    label: "",
    issuingCountry: "",
    expiryDate: "",
  });

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentsApi.getByTrip(trip._id);
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(getErrorMessage(err, "Unable to load documents for this trip."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip._id) fetchDocuments();
  }, [trip._id]);

  const resetForm = () =>
    setFormData({ type: "passport", label: "", issuingCountry: "", expiryDate: "" });

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      await documentsApi.create({ ...formData, tripId: trip._id });
      setIsAddModalOpen(false);
      resetForm();
      fetchDocuments();
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not add document."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await documentsApi.remove(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  if (loading) return <LoadingState message="Loading your travel documents..." />;

  return (
    <div className="space-y-10">
      <div className="pb-4 border-b border-[#E5E2E1] flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            Travel Documents
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Passport, Visa &amp; Insurance
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            We only store expiry dates and labels here — never full document
            numbers.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Document
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded border border-[#E5E2E1] bg-[#FCF9F8] text-sm text-[#54433A]">
          {error}
        </div>
      )}

      {documents.length === 0 && !error ? (
        <EmptyState
          icon={FileText}
          title="No documents added yet"
          description="Track your passport, visa, and insurance expiry dates so nothing catches you off guard before this trip."
          actionLabel="Add Document"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.ok;
            return (
              <div
                key={doc._id}
                className="flex items-center justify-between p-4 rounded border border-[#E5E2E1] bg-white"
              >
                <div className="flex items-center gap-3">
                  {doc.status !== "ok" && (
                    <AlertTriangle className="w-4 h-4 text-[#6C2F00] shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#1C1B1B]">
                      {doc.label}{" "}
                      <span className="text-xs text-[#54433A]">
                        ({TYPE_LABELS[doc.type] || doc.type})
                      </span>
                    </p>
                    <p className="text-xs text-[#54433A]">
                      Expires {new Date(doc.expiryDate).toLocaleDateString()}
                      {doc.issuingCountry ? ` · ${doc.issuingCountry}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={badge.variant}>{badge.text}</Badge>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="text-[#54433A] hover:text-[#6C2F00]"
                    aria-label="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Travel Document"
      >
        <form onSubmit={handleAddDocument} className="space-y-4">
          {formError && (
            <div className="text-sm text-red-600">{formError}</div>
          )}
          <FormField
            label="Type"
            name="type"
            as="select"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            <option value="passport">Passport</option>
            <option value="visa">Visa</option>
            <option value="insurance">Travel Insurance</option>
            <option value="other">Other</option>
          </FormField>
          <FormField
            label="Label"
            name="label"
            placeholder="e.g. Indian Passport"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            required
          />
          <FormField
            label="Issuing Country (optional)"
            name="issuingCountry"
            placeholder="e.g. India"
            value={formData.issuingCountry}
            onChange={(e) =>
              setFormData({ ...formData, issuingCountry: e.target.value })
            }
          />
          <FormField
            label="Expiry Date"
            name="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) =>
              setFormData({ ...formData, expiryDate: e.target.value })
            }
            required
          />
          <Button type="submit" disabled={formLoading} className="w-full">
            {formLoading ? "Adding..." : "Add Document"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default TripDocumentsTab;

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface ServiceHistoryFormData {
  branch: string;
  startDate: string;
  endDate: string;
  job: string;
  deployments: string;
}

interface ServiceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serviceHistory: ServiceHistoryFormData) => void;
  onUpdate?: (id: string, serviceHistory: ServiceHistoryFormData) => void;
  initialData?: {
    id: string;
    branch: string;
    start_date: string;
    end_date: string;
    job: string;
    deployments: string[] | null;
  } | null;
  isEditing?: boolean;
}

const ServiceHistoryModal: React.FC<ServiceHistoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  initialData = null,
  isEditing = false,
}) => {
  const [branch, setBranch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [job, setJob] = useState("");
  const [deployments, setDeployments] = useState("");

  // Set initial form values when editing an existing entry
  useEffect(() => {
    if (initialData && isEditing) {
      setBranch(initialData.branch || "");
      setStartDate(initialData.start_date || "");
      setEndDate(initialData.end_date || "");
      setJob(initialData.job || "");
      setDeployments(
        initialData.deployments ? initialData.deployments.join(", ") : "",
      );
    } else {
      // Reset form when not editing or when modal is closed and reopened for adding
      setBranch("");
      setStartDate("");
      setEndDate("");
      setJob("");
      setDeployments("");
    }
  }, [initialData, isEditing, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!branch || !startDate || !endDate || !job) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      toast.error("End date cannot be before start date");
      return;
    }

    const formData: ServiceHistoryFormData = {
      branch,
      startDate,
      endDate,
      job,
      deployments,
    };

    if (isEditing && initialData && onUpdate) {
      // Update existing service history
      onUpdate(initialData.id, formData);
    } else {
      // Add new service history
      onSubmit(formData);
    }

    // Reset form fields and close modal
    // (Form will be reset by useEffect when reopened)
    onClose();
  };

  return (
    <div
      className={`fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50 ${!isOpen ? "hidden" : ""}`}
    >
      <div className="bg-white rounded-md p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isEditing ? "Edit" : "Add"} Service History
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="branch"
              className="block mb-2 font-bold text-gray-700"
            >
              Branch of Service
            </label>
            <select
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select a branch</option>
              <option value="army">Army</option>
              <option value="navy">Navy</option>
              <option value="air force">Air Force</option>
              <option value="marines">Marines</option>
              <option value="coast guard">Coast Guard</option>
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="startDate"
              className="block mb-2 font-bold text-gray-700"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="endDate"
              className="block mb-2 font-bold text-gray-700"
            >
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="job" className="block mb-2 font-bold text-gray-700">
              Job/MOS
            </label>
            <input
              id="job"
              type="text"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="deployments"
              className="block mb-2 font-bold text-gray-700"
            >
              Deployments (optional, comma-separated)
            </label>
            <textarea
              id="deployments"
              rows={3}
              value={deployments}
              onChange={(e) => setDeployments(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-2"
            >
              {isEditing ? "Update" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceHistoryModal;

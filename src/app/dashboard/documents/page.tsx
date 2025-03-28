"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../supabase/client"; // Adjust path if needed
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Trash2, UploadCloud } from "lucide-react"; // Import icons
import ConfirmationModal from "@/components/confirmation-modal"; // Import ConfirmationModal

// Define type for document metadata (matches our DB table)
type DocumentMetadata = {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
};

export default function DocumentsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Page loading
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false); // Loading for document list/actions
  const [uploading, setUploading] = useState(false); // Loading for upload action
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
  const router = useRouter();

  // --- Standard User Fetching Logic ---
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          router.push("/sign-in");
          return;
        }
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          router.push("/sign-in");
          return;
        }
        setUser(data.user);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred",
        );
        router.push("/sign-in"); // Redirect on error
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // --- Fetch Documents Logic (Placeholder) ---
  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    setDocumentsLoading(true);
    // TODO: Implement Supabase fetch logic here
    console.log("Fetching documents...");
    // Placeholder: Clear documents for now
    setDocuments([]);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate loading
    setDocumentsLoading(false);
    console.log("Finished fetching (placeholder).");
  };

  // --- Upload Logic (Placeholder) ---
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: Implement Supabase upload logic here
    console.log("Upload handler triggered");
    const file = event.target.files?.[0];
    if (!file) return;
    console.log("File selected:", file.name);
    setUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate upload
    setUploading(false);
    toast.success(`Placeholder: "${file.name}" uploaded.`);
    fetchDocuments(); // Refresh list after upload
  };

  // --- Delete Logic (Placeholder/Setup) ---
  const handleDeleteClick = (doc: DocumentMetadata) => {
    setDocumentToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    console.log("Deleting document:", documentToDelete.file_name);
    setDocumentsLoading(true); // Indicate loading during delete
    // TODO: Implement Supabase delete (storage & db) logic here
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delete
    toast.success(`Placeholder: "${documentToDelete.file_name}" deleted.`);
    setShowDeleteConfirm(false);
    setDocumentToDelete(null);
    fetchDocuments(); // Refresh list after delete
    // setDocumentsLoading(false); // fetchDocuments will handle this
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDocumentToDelete(null);
  };

  // --- Loading/Error States ---
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }
  if (!user) {
    // Should be handled by effect, but good fallback
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p>Redirecting...</p>
      </div>
    );
  }

  // --- Render JSX ---
  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50">
      <DashboardNavbar />
      <header className="w-full bg-gray-100 py-3 px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center text-gray-800">
          Documents
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-4xl">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mb-6">
            <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center space-x-2"
              >
                <UploadCloud size={18} />
                <span>{uploading ? "Uploading..." : "Choose File"}</span>
              </Button>
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" // Example file types
              />
              <span className="text-sm text-gray-500">
                Max 50MB. Types: PDF, DOC(X), JPG, PNG.
              </span>
            </div>
            {uploading && (
              <p className="text-sm text-blue-600 mt-2 animate-pulse">
                Upload in progress...
              </p>
            )}
          </div>

          {/* Document List Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
            {documentsLoading && documents.length === 0 ? (
              <p className="text-gray-500 italic animate-pulse">
                Loading documents...
              </p>
            ) : !documentsLoading && documents.length === 0 ? (
              <p className="text-gray-500 italic">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex justify-between items-center p-3 border rounded-md bg-gray-50 hover:bg-gray-100"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        {doc.file_name}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        (
                        {doc.size_bytes
                          ? (doc.size_bytes / 1024 / 1024).toFixed(2) + " MB"
                          : "N/A"}
                        )
                      </span>
                      <span className="text-xs text-gray-400 block">
                        Uploaded:{" "}
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(doc)}
                      disabled={documentsLoading} // Disable while list is loading/deleting
                      className="text-red-600 hover:text-red-800 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                      <span className="ml-1">Delete</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message={`Are you sure you want to delete the document "${documentToDelete?.file_name}"? This action cannot be undone.`}
      />
    </div>
  );
}

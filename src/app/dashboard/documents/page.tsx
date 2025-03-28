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
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false }); // Show newest first

      if (error) {
        console.error("Error fetching documents:", error);
        toast.error(`Failed to load documents: ${error.message}`);
        setDocuments([]); // Set empty array on error
      } else {
        console.log("Fetched documents:", data);
        setDocuments(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
      toast.error("An unexpected error occurred while loading documents.");
      setDocuments([]); // Set empty array on unexpected error
    } finally {
      setDocumentsLoading(false);
    }
  };

  // --- Upload Logic (Placeholder) ---
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      // Clear the file input value in case the same file is selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Optional: Check file size (example: max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50 MB in bytes
    if (file.size > maxSize) {
      toast.error(`File size exceeds the limit of 50 MB.`);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    const supabase = createClient();
    // Generate a unique path: user_id/uuid_or_timestamp_prefix_filename.ext
    // Using timestamp and original name for simplicity here, UUID is safer for absolute uniqueness
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`; // Sanitize filename slightly
    const filePath = `${user.id}/${fileName}`;

    try {
      // 1. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("claim-documents") // Use the correct bucket name
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        toast.error(`Upload failed: ${uploadError.message}`);
        throw uploadError; // Stop execution if upload fails
      }

      console.log("File uploaded successfully:", uploadData);

      // 2. Insert metadata into the 'documents' table
      const { error: insertError } = await supabase.from("documents").insert({
        user_id: user.id,
        file_name: file.name, // Store original file name
        storage_path: uploadData.path, // Use path from upload response
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString(), // Set upload time explicitly
        // created_at, updated_at will use defaults
      });

      if (insertError) {
        console.error("Error inserting document metadata:", insertError);
        toast.error(`Failed to save document record: ${insertError.message}`);
        // Attempt to clean up the uploaded file if DB insert fails
        try {
          await supabase.storage
            .from("claim-documents")
            .remove([uploadData.path]);
          console.log("Cleaned up orphaned file from storage.");
        } catch (cleanupError) {
          console.error("Failed to cleanup orphaned file:", cleanupError);
          toast.error("Failed to cleanup orphaned file after database error.");
        }
        throw insertError; // Stop execution
      }

      toast.success(`Document "${file.name}" uploaded successfully.`);
      fetchDocuments(); // Refresh the list
    } catch (err) {
      // Errors thrown above will be caught here
      console.error("Upload process failed:", err);
      // Specific toasts are shown above, maybe a generic fallback here if needed
      // toast.error('An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
      // Clear the file input value after attempt (success or fail)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // --- Delete Logic (Placeholder/Setup) ---
  const handleDeleteClick = (doc: DocumentMetadata) => {
    setDocumentToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete || !user) return;

    setDocumentsLoading(true); // Use documentsLoading to disable buttons during delete
    setShowDeleteConfirm(false); // Close modal immediately
    const supabase = createClient();
    const docToDelete = documentToDelete; // Capture current value
    setDocumentToDelete(null); // Clear state early

    try {
      // 1. Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("claim-documents") // Use the correct bucket name
        .remove([docToDelete.storage_path]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Handle specific error where file might not exist (e.g., code 404 or similar message)
        // Supabase client v2 might return a specific error object structure or message
        // We might want to ignore "Not Found" errors during cleanup or if deletion is retried
        if (
          storageError.message.includes("Not Found") ||
          (storageError as any).statusCode === 404
        ) {
          console.warn(
            `File not found in storage during deletion attempt (path: ${docToDelete.storage_path}), proceeding with DB deletion.`,
          );
        } else {
          // For other storage errors, show toast and stop
          toast.error(
            `Failed to delete file from storage: ${storageError.message}`,
          );
          throw storageError; // Stop execution
        }
      } else {
        console.log("File deleted from storage successfully.");
      }

      // 2. Delete metadata from the 'documents' table
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", docToDelete.id)
        .eq("user_id", user.id); // Extra safety check

      if (dbError) {
        console.error("Error deleting document metadata:", dbError);
        toast.error(`Failed to delete document record: ${dbError.message}`);
        // The file might be deleted from storage, log potential inconsistency
        console.warn(
          `Inconsistency: File ${docToDelete.storage_path} might be deleted from storage, but DB record deletion failed.`,
        );
        throw dbError;
      }

      toast.success(
        `Document "${docToDelete.file_name}" deleted successfully.`,
      );
      fetchDocuments(); // Refresh the list
    } catch (err) {
      console.error("Delete process failed:", err);
      // Avoid showing generic error if specific one was already shown
      if (
        !(err as any)?.message?.includes("storage") &&
        !(err as any)?.message?.includes("database")
      ) {
        toast.error("An error occurred during deletion.");
      }
      // Re-fetch documents even on error to ensure UI consistency
      fetchDocuments();
    } finally {
      // Ensure loading is stopped and documentToDelete is null
      // Note: setDocumentsLoading(false) is called within fetchDocuments
      setDocumentToDelete(null);
    }
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

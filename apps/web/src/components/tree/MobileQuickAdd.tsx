import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Camera,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Save,
  User,
  Calendar,
  FileText,
  Check,
  Loader2,
  Image,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface QuickAddPersonData {
  firstName: string;
  lastName: string;
  birthYear?: number;
  gender: Gender;
  photoUrl?: string;
  photoBlob?: Blob;
  biography?: string;
  isDraft: boolean;
}

interface MobileQuickAddProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuickAddPersonData) => Promise<void>;
  onSaveDraft?: (data: QuickAddPersonData) => void;
  existingDraft?: QuickAddPersonData | null;
  parentId?: string;
  parentName?: string;
  relationshipType?: 'CHILD' | 'SPOUSE' | 'SIBLING';
}

const DRAFT_STORAGE_KEY = 'mindmapper_quick_add_draft';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

// Voice recognition setup
function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognitionClass ? new SpeechRecognitionClass() : null;
}

export function MobileQuickAdd({
  treeId,
  isOpen,
  onClose,
  onSubmit,
  onSaveDraft,
  existingDraft,
  parentId: _parentId,
  parentName,
  relationshipType,
}: MobileQuickAddProps) {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [gender, setGender] = useState<Gender>('UNKNOWN');
  const [biography, setBiography] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);

  // UI state
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check for voice support
  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognition());
  }, []);

  // Load existing draft
  useEffect(() => {
    if (existingDraft) {
      setFirstName(existingDraft.firstName);
      setLastName(existingDraft.lastName);
      setBirthYear(existingDraft.birthYear?.toString() || '');
      setGender(existingDraft.gender);
      setBiography(existingDraft.biography || '');
      if (existingDraft.photoUrl) {
        setPhotoPreview(existingDraft.photoUrl);
      }
      setHasDraft(true);
    } else {
      // Check localStorage for draft
      const savedDraft = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${treeId}`);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft) as QuickAddPersonData;
          setFirstName(draft.firstName);
          setLastName(draft.lastName);
          setBirthYear(draft.birthYear?.toString() || '');
          setGender(draft.gender);
          setBiography(draft.biography || '');
          if (draft.photoUrl) {
            setPhotoPreview(draft.photoUrl);
          }
          setHasDraft(true);
        } catch {
          // Invalid draft, ignore
        }
      }
    }
  }, [existingDraft, treeId]);

  // Auto-save draft when form changes
  useEffect(() => {
    if (firstName || lastName || birthYear || biography) {
      const draft: QuickAddPersonData = {
        firstName,
        lastName,
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
        gender,
        biography: biography || undefined,
        photoUrl: photoPreview || undefined,
        isDraft: true,
      };
      localStorage.setItem(`${DRAFT_STORAGE_KEY}_${treeId}`, JSON.stringify(draft));
      setHasDraft(true);
    }
  }, [firstName, lastName, birthYear, gender, biography, photoPreview, treeId]);

  // Cleanup camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Failed to access camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setPhotoBlob(blob);
        setPhotoPreview(URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.8);

    stopCamera();
  }, [stopCamera]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image is too large. Maximum size is 10MB.');
      return;
    }

    setPhotoBlob(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  // Remove photo
  const removePhoto = useCallback(() => {
    setPhotoBlob(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
  }, [photoPreview]);

  // Start voice recording
  const startVoiceRecording = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setBiography(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  // Stop voice recording
  const stopVoiceRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // Toggle voice recording
  const toggleVoiceRecording = useCallback(() => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }, [isRecording, startVoiceRecording, stopVoiceRecording]);

  // Clear form
  const clearForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setBirthYear('');
    setGender('UNKNOWN');
    setBiography('');
    removePhoto();
    localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${treeId}`);
    setHasDraft(false);
  }, [removePhoto, treeId]);

  // Handle submit
  const handleSubmit = async () => {
    if (!firstName.trim()) {
      alert('First name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: QuickAddPersonData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
        gender,
        biography: biography.trim() || undefined,
        photoUrl: photoPreview || undefined,
        photoBlob: photoBlob || undefined,
        isDraft: false,
      };

      await onSubmit(data);

      // Clear draft on successful submit
      localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${treeId}`);
      clearForm();
      onClose();
    } catch (error) {
      console.error('Failed to add person:', error);
      alert('Failed to add person. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle save draft
  const handleSaveDraft = () => {
    const draft: QuickAddPersonData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
      gender,
      biography: biography.trim() || undefined,
      photoUrl: photoPreview || undefined,
      isDraft: true,
    };

    onSaveDraft?.(draft);
    onClose();
  };

  // Handle close
  const handleClose = () => {
    stopCamera();
    stopVoiceRecording();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopVoiceRecording();
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [stopCamera, stopVoiceRecording, photoPreview]);

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quick Add Person</h2>
            {parentName && relationshipType && (
              <p className="text-sm text-gray-500">
                Adding {relationshipType.toLowerCase()} of {parentName}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Draft indicator */}
          {hasDraft && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800 flex-1">Draft saved automatically</span>
              <button
                onClick={clearForm}
                className="text-amber-600 hover:text-amber-800 p-1"
                title="Clear draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Photo Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photo
            </label>

            {isCameraOpen ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopCamera}
                    className="bg-white/90"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={capturePhoto}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    onClick={() => {
                      removePhoto();
                      startCamera();
                    }}
                    className="p-2 bg-white/90 rounded-full shadow hover:bg-white"
                    title="Retake photo"
                  >
                    <RotateCcw className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={removePhoto}
                    className="p-2 bg-white/90 rounded-full shadow hover:bg-white"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Camera className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Take Photo</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Image className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Choose File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                First Name*
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Birth Year & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Birth Year
              </label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder={currentYear.toString()}
                min="1000"
                max={currentYear}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-white"
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          {/* More Details Toggle */}
          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Add more details later
            </span>
            {showMoreDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* More Details Section */}
          {showMoreDetails && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Biography</label>
                  {voiceSupported && (
                    <button
                      onClick={toggleVoiceRecording}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                        isRecording
                          ? 'bg-red-100 text-red-600 animate-pulse'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-3 h-3" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3" />
                          Voice
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Add a brief biography or notes about this person..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base resize-none"
                />
                {isRecording && (
                  <p className="text-xs text-red-600 animate-pulse">
                    Listening... speak now
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-3 border-t bg-gray-50">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting || (!firstName && !lastName)}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !firstName.trim()}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Add Person
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CSS for slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default MobileQuickAdd;

"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/app/components/button";
import Loading from "@/app/components/loading";

interface FastCreatePopupProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    placeholder: string;
    onGenerate: (text: string, options: { generateFinalQuiz: boolean; generateLessonQuizzes: boolean; finalQuizSettings: { includeMCQ: boolean; includeFRQ: boolean; quizStyle: "practice" | "knowledge_test" | "mixed"; length: "short" | "normal" | "long"; customPrompt?: string }; lessonQuizSettings: { includeMCQ: boolean; includeFRQ: boolean; quizStyle: "practice" | "knowledge_test" | "mixed"; length: "short" | "normal" | "long"; customPrompt?: string } }, onUpdate: (message: string) => void) => Promise<void>;
    isGenerating: boolean;
    mode: 'course' | 'lesson';
}

export default function FastCreatePopup({
    isOpen,
    onClose,
    title,
    placeholder,
    onGenerate,
    isGenerating,
    mode,
}: FastCreatePopupProps) {
    const [text, setText] = useState("");
    const [streamMessages, setStreamMessages] = useState<string[]>([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [generateFinalQuiz, setGenerateFinalQuiz] = useState(false);
    const [generateLessonQuizzes, setGenerateLessonQuizzes] = useState(false);
    const [finalQuizSettings, setFinalQuizSettings] = useState<{ includeMCQ: boolean; includeFRQ: boolean; quizStyle: "practice" | "knowledge_test" | "mixed"; length: "short" | "normal" | "long"; customPrompt?: string }>({ includeMCQ: true, includeFRQ: false, quizStyle: "mixed", length: "normal" });
    const [lessonQuizSettings, setLessonQuizSettings] = useState<{ includeMCQ: boolean; includeFRQ: boolean; quizStyle: "practice" | "knowledge_test" | "mixed"; length: "short" | "normal" | "long"; customPrompt?: string }>({ includeMCQ: true, includeFRQ: false, quizStyle: "mixed", length: "normal" });
    const messagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTo({
                top: messagesRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [streamMessages]);

    const handleGenerate = async () => {
        if (!text.trim()) return;
        setStreamMessages(['Initializing...']);
        setIsCompleted(false);
        setHasError(false);
        try {
            await onGenerate(text, { generateFinalQuiz, generateLessonQuizzes, finalQuizSettings, lessonQuizSettings }, (message: string) => {
                setStreamMessages(prev => [...prev, message]);
                if (message.includes('Error') || message.includes('error')) {
                    setHasError(true);
                }
            });
            setIsCompleted(true);
        } catch (error) {
            console.error('Generation error:', error);
            setHasError(true);
            setStreamMessages(prev => [...prev, 'An error occurred during generation.']);
        }
    };

    const handleClose = () => {
        setText("");
        setStreamMessages([]);
        setIsCompleted(false);
        setHasError(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--neutral-200)] p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>
                    {!isGenerating && (
                        <button
                            onClick={handleClose}
                            className="text-[var(--neutral-500)] hover:text-[var(--foreground)] text-2xl"
                        >
                            ×
                        </button>
                    )}
                </div>

                {isGenerating ? (
                    <div>
                        <Loading small={true} loadingText="Generating..." />
                        {streamMessages.length > 0 && (
                            <div ref={messagesRef} className="mt-4 p-3 bg-[var(--neutral-100)] rounded-md max-h-48 overflow-y-auto">
                                <h3 className="font-semibold mb-2">Progress:</h3>
                                <ul className="space-y-1 text-sm">
                                    {streamMessages.map((msg, index) => (
                                        <li key={index} className={`${
                                            msg.includes('Error') || msg.includes('error') ? 'text-red-500' : 'text-[var(--foreground)]'
                                        }`}>{msg}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : isCompleted || hasError ? (
                    <div>
                        <div className={`p-3 rounded-md mb-4 ${
                            hasError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                            <h3 className="font-semibold">
                                {hasError ? 'Generation Failed' : 'Generation Completed'}
                            </h3>
                            <p className="text-sm mt-1">
                                {hasError ? 'An error occurred during course generation.' : 'Your course has been generated successfully.'}
                            </p>
                        </div>
                        {streamMessages.length > 0 && (
                            <div ref={messagesRef} className="p-3 bg-[var(--neutral-100)] rounded-md max-h-48 overflow-y-auto">
                                <h3 className="font-semibold mb-2">Details:</h3>
                                <ul className="space-y-1 text-sm">
                                    {streamMessages.map((msg, index) => (
                                        <li key={index} className={`${
                                            msg.includes('Error') || msg.includes('error') ? 'text-red-500' : 'text-[var(--foreground)]'
                                        }`}>{msg}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <Button color="var(--accent-500)" onClick={handleClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                 ) : (
                     <>
                         <textarea
                             value={text}
                             onChange={(e) => setText(e.target.value)}
                             className="w-full p-3 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-48 resize-y"
                             placeholder={placeholder}
                         />
                          <div className="mt-4">
                              <div className="flex flex-col gap-4">
                                  {mode === 'course' && (
                                      <div className="flex flex-col gap-2">
                                          <button
                                              className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap self-start ${generateFinalQuiz ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                              onClick={() => setGenerateFinalQuiz(!generateFinalQuiz)}
                                          >
                                              Generate final quiz
                                          </button>
                                           {generateFinalQuiz && (
                                               <div className="ml-4 p-3 bg-[var(--neutral-100)] rounded-md">
                                                   <div className="flex flex-col gap-3">
                                                       <div>
                                                           <h4 className="text-sm font-medium mb-2">Question Types:</h4>
                                                           <div className="flex gap-2">
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.includeMCQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => {
                                                                       if (!finalQuizSettings.includeFRQ && finalQuizSettings.includeMCQ) return;
                                                                       setFinalQuizSettings(prev => ({ ...prev, includeMCQ: !prev.includeMCQ }));
                                                                   }}
                                                               >
                                                                   Multiple Choice
                                                               </button>
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.includeFRQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => {
                                                                       if (!finalQuizSettings.includeMCQ && finalQuizSettings.includeFRQ) return;
                                                                       setFinalQuizSettings(prev => ({ ...prev, includeFRQ: !prev.includeFRQ }));
                                                                   }}
                                                               >
                                                                   Free Response
                                                               </button>
                                                           </div>
                                                       </div>
                                                       <div>
                                                           <h4 className="text-sm font-medium mb-2">Style:</h4>
                                                           <div className="flex gap-2">
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.quizStyle === 'practice' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => setFinalQuizSettings(prev => ({ ...prev, quizStyle: 'practice' }))}
                                                               >
                                                                   Practice Problems
                                                               </button>
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.quizStyle === 'knowledge_test' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => setFinalQuizSettings(prev => ({ ...prev, quizStyle: 'knowledge_test' }))}
                                                               >
                                                                   Knowledge Test
                                                               </button>
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.quizStyle === 'mixed' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => setFinalQuizSettings(prev => ({ ...prev, quizStyle: 'mixed' }))}
                                                               >
                                                                   Mixed
                                                               </button>
                                                           </div>
                                                       </div>
                                                       <div>
                                                           <h4 className="text-sm font-medium mb-2">Length:</h4>
                                                           <div className="flex gap-2">
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.length === 'short' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => setFinalQuizSettings(prev => ({ ...prev, length: 'short' }))}
                                                               >
                                                                   Short & Quick
                                                               </button>
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.length === 'normal' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => setFinalQuizSettings(prev => ({ ...prev, length: 'normal' }))}
                                                               >
                                                                   Normal
                                                               </button>
                                                               <button
                                                                   className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${finalQuizSettings.length === 'long' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                                   onClick={() => setFinalQuizSettings(prev => ({ ...prev, length: 'long' }))}
                                                               >
                                                                   Comprehensive
                                                               </button>
                                                           </div>
                                                       </div>
                                                       <div>
                                                           <h4 className="text-sm font-medium mb-2">Custom Instructions (Optional):</h4>
                                                           <textarea
                                                               className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-20 resize-y text-sm"
                                                               placeholder="Add any specific instructions for quiz generation..."
                                                               value={finalQuizSettings.customPrompt || ''}
                                                               onChange={(e) => setFinalQuizSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
                                                           />
                                                       </div>
                                                   </div>
                                               </div>
                                           )}
                                       </div>
                                   )}
                                  <div className="flex flex-col gap-2">
                                      <button
                                          className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap self-start ${generateLessonQuizzes ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                          onClick={() => setGenerateLessonQuizzes(!generateLessonQuizzes)}
                                      >
                                          {mode === 'course' ? 'Generate quiz for each lesson' : 'Generate quiz for lesson'}
                                      </button>
                                       {generateLessonQuizzes && (
                                           <div className="ml-4 p-3 bg-[var(--neutral-100)] rounded-md">
                                               <div className="flex flex-col gap-3">
                                                   <div>
                                                       <h4 className="text-sm font-medium mb-2">Question Types:</h4>
                                                       <div className="flex gap-2">
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.includeMCQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => {
                                                                   if (!lessonQuizSettings.includeFRQ && lessonQuizSettings.includeMCQ) return;
                                                                   setLessonQuizSettings(prev => ({ ...prev, includeMCQ: !prev.includeMCQ }));
                                                               }}
                                                           >
                                                               Multiple Choice
                                                           </button>
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.includeFRQ ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => {
                                                                   if (!lessonQuizSettings.includeMCQ && lessonQuizSettings.includeFRQ) return;
                                                                   setLessonQuizSettings(prev => ({ ...prev, includeFRQ: !prev.includeFRQ }));
                                                               }}
                                                           >
                                                               Free Response
                                                           </button>
                                                       </div>
                                                   </div>
                                                   <div>
                                                       <h4 className="text-sm font-medium mb-2">Style:</h4>
                                                       <div className="flex gap-2">
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.quizStyle === 'practice' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => setLessonQuizSettings(prev => ({ ...prev, quizStyle: 'practice' }))}
                                                           >
                                                               Practice Problems
                                                           </button>
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.quizStyle === 'knowledge_test' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => setLessonQuizSettings(prev => ({ ...prev, quizStyle: 'knowledge_test' }))}
                                                           >
                                                               Knowledge Test
                                                           </button>
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.quizStyle === 'mixed' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => setLessonQuizSettings(prev => ({ ...prev, quizStyle: 'mixed' }))}
                                                           >
                                                               Mixed
                                                           </button>
                                                       </div>
                                                   </div>
                                                   <div>
                                                       <h4 className="text-sm font-medium mb-2">Length:</h4>
                                                       <div className="flex gap-2">
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.length === 'short' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => setLessonQuizSettings(prev => ({ ...prev, length: 'short' }))}
                                                           >
                                                               Short & Quick
                                                           </button>
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.length === 'normal' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => setLessonQuizSettings(prev => ({ ...prev, length: 'normal' }))}
                                                           >
                                                               Normal
                                                           </button>
                                                           <button
                                                               className={`px-3 py-1 rounded-md transition-colors duration-200 text-sm whitespace-nowrap ${lessonQuizSettings.length === 'long' ? 'bg-[var(--accent-500)] text-white' : 'bg-[var(--neutral-300)] text-[var(--neutral-700)] hover:bg-[var(--neutral-400)]'}`}
                                                               onClick={() => setLessonQuizSettings(prev => ({ ...prev, length: 'long' }))}
                                                           >
                                                               Comprehensive
                                                           </button>
                                                       </div>
                                                   </div>
                                                   <div>
                                                       <h4 className="text-sm font-medium mb-2">Custom Instructions (Optional):</h4>
                                                       <textarea
                                                           className="w-full p-2 border border-[var(--neutral-300)] rounded-md bg-[var(--neutral-100)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] h-20 resize-y text-sm"
                                                           placeholder="Add any specific instructions for quiz generation..."
                                                           value={lessonQuizSettings.customPrompt || ''}
                                                           onChange={(e) => setLessonQuizSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
                                                       />
                                                   </div>
                                               </div>
                                           </div>
                                       )}
                                  </div>
                              </div>
                          </div>
                         <div className="mt-4 flex justify-end gap-2">
                            <Button color="var(--neutral-400)" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                color="var(--accent-500)"
                                onClick={handleGenerate}
                                disabled={!text.trim()}
                            >
                                Generate
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

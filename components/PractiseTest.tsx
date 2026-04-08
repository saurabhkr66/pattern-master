// components/PracticeButton.tsx
"use client";

import { useState } from "react";

export default function PracticeButton({ patternId, topicName }: { patternId: string, topicName: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // New State for Quiz Interaction
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setQuestion(null);
    setSelectedAnswer(null);
    setIsRevealed(false);

    try {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, difficulty: "Medium" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate");
      setQuestion(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerClick = async (optionString: string) => {
    if (isRevealed) return; // Prevent clicking again after answering
    
    // Extract just the letter (e.g., "A" from "A. 45ms")
    const guessedLetter = optionString.charAt(0);
    const isCorrect = guessedLetter === question.correct_answer;
    
    setSelectedAnswer(guessedLetter);
    setIsRevealed(true);

    // Save progress to the database behind the scenes!
    try {
      await fetch("/api/save-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          isCorrect: isCorrect,
        }),
      });
    } catch (err) {
      console.error("Failed to save progress", err);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">{topicName}</h3>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {isLoading ? "Generating..." : "Generate Question"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}

      {question && (
        <div className="mt-4 p-5 bg-gray-50 rounded-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-4 whitespace-pre-wrap">{question.question_text}</p>
          
          <div className="space-y-3">
            {question.options.map((option: string, i: number) => {
              const optionLetter = option.charAt(0);
              const isSelected = selectedAnswer === optionLetter;
              const isActuallyCorrect = optionLetter === question.correct_answer;
              
              // Figure out what color the button should be
              let buttonColor = "bg-white border-gray-300 hover:bg-blue-50";
              if (isRevealed) {
                if (isActuallyCorrect) buttonColor = "bg-green-100 border-green-500 text-green-900"; // Correct answer is always green
                else if (isSelected && !isActuallyCorrect) buttonColor = "bg-red-100 border-red-500 text-red-900"; // Wrong guess is red
                else buttonColor = "bg-white border-gray-200 opacity-50"; // Others are faded
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswerClick(option)}
                  disabled={isRevealed}
                  className={`w-full text-left p-3 border rounded-md transition-all ${buttonColor}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Show explanation only after they guess */}
          {isRevealed && (
            <div className="mt-6 p-4 bg-blue-50 text-blue-900 rounded-md border border-blue-200 text-sm">
              <span className="font-bold block mb-1">
                {selectedAnswer === question.correct_answer ? "🎉 Correct!" : "❌ Incorrect."}
              </span>
              <strong>Explanation:</strong> {question.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
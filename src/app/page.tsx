"use client";

import { useState } from "react";
import { AffindaCredential, AffindaAPI } from "@affinda/affinda";

const credential = new AffindaCredential(
  process.env.NEXT_PUBLIC_AFFINDA_API_KEY as string
);
const client = new AffindaAPI(credential);

export default function Home() {
  const [score, setScore] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Array<string> | null>(null);

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setFile(event.dataTransfer.files![0]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files![0]);
  };

  const analyzeResume = async () => {
    if (!file) {
      return alert("Please upload your resume.");
    }

    const jobDescInp = document.getElementById(
      "job-description"
    ) as HTMLTextAreaElement;
    const jobDesc = jobDescInp.value;

    if (jobDesc.length < 30) {
      return alert("Job description must be atleast 30 charecters long.");
    }

    if (jobDesc.length > 2000) {
      return alert("Job description cannot be longer than 2000 charecters");
    }

    try {
      setIsAnalyzing(true);
      setJobDescription(jobDesc);

      const resume = await client.createResume({
        file: file.stream(),
      });

      const indexDoc = async () => {
        await client.createIndexDocument("my-index", {
          document: resume.meta.identifier,
        });
      };

      // apperently we first need to create an index and then
      // index the document and only then we can proceed, but
      // if the index doesnt exist it will raise an exception
      // and hence the try catch. this is probbaly the only
      // exception that can raise here. The api is unclear
      try {
        await indexDoc();
      } catch (e) {
        await client.createIndex({ name: "my-index" });
        await indexDoc();
      }

      const blob = new Blob([jobDesc], { type: "text/plain" });
      const jd = await client.createJobDescription({
        file: blob.stream(),
      });

      const match = await client.getResumeSearchMatch(
        resume.meta.identifier as string,
        jd.meta.identifier as string
      );

      const skills = jd.data?.skills;
      if (skills) {
        const sugs = await client.getResumeSearchSuggestionSkill(
          skills
            .map((s) => s?.parsed)
            .filter((s) => s !== undefined && s !== null)
        );
        // the library is weird, according to the library
        // sugs should be an object having body as n attr
        // which will be an array of strings but the sugs
        // itself is that array
        setSuggestions(sugs as any);
      }

      setScore((match.score || 0) * 100);
      setIsAnalyzing(false);
    } catch (e: any) {
      if (e.message.includes("no_parsing_credits")) {
        setIsAnalyzing(false);
        alert("Your daily limit has reahced please try again later.");
      }
    }
  };

  return (
    <main className="py-12 flex flex-col items-center justify-center">
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-[40px] leading-[60px] font-medium">
          Is your resume good enough?
        </h1>

        {isAnalyzing ? (
          <span className="self-center">
            Please wait while we analyze your resume...
          </span>
        ) : (
          <>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
            />

            <label
              className={`
                border-[1px] rounded-[10px]
                border-dashed border-gray-500
                px-10 py-6 flex flex-col items-center
                justify-center min-w-full min-h-36
                ${!isAnalyzing && "hover:cursor-pointer"}
                `}
              htmlFor="file-upload"
              onClick={(e) => {
                isAnalyzing && e.preventDefault();
              }}
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
            >
              {file ? (
                <span className="text-center">
                  Uploaded File: {file.name}
                  <br />
                  You can drop or choose another file.
                </span>
              ) : (
                <span className="text-center">
                  Drop your resume here or choose a file.
                  <br />
                  PDF & DOCX only. Max 2MB file size.
                </span>
              )}
            </label>

            <textarea
              id="job-description"
              placeholder="Enter your job description"
              className="border-[1px] border-gray-300 rounded-[4px] px-4 py-2 min-w-full max-w-md focus:border-none bg-transparent min-h-32"
              maxLength={2000}
              minLength={30}
              defaultValue={jobDescription}
            />

            <button
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-teal-400 hover:to-blue-500 rounded-[4px] px-4 py-2 font-bold"
              onClick={analyzeResume}
            >
              Analyze Resume
            </button>

            {score != null && (
              <div className="border-[1px] border-gray-300 rounded-[4px] px-4 py-2 min-w-full flex flex-col items-start">
                <h1 className="self-center font-bold text-[25px]">Result</h1>

                <span>Your resume scored {score}/100.</span>

                {suggestions && (
                  <span>Suggestions: {suggestions.join(", ")}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

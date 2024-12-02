document
  .getElementById("summarizeButton")
  .addEventListener("click", async () => {
    const inputText = document.getElementById("inputText").value.trim();
    const fileInput = document.getElementById("fileInput").files[0];
    const summaryDiv = document.getElementById("summaryText");

    // Clear previous summary and show loading message
    summaryDiv.innerText = "Summarizing... Please wait.";

    if (!inputText && !fileInput) {
      summaryDiv.innerText =
        "Please provide text or upload a file to summarize.";
      return;
    }

    try {
      let textToSummarize = inputText;

      if (fileInput) {
        const fileText = await extractTextFromFile(fileInput);
        textToSummarize = fileText || "";
      }

      if (!textToSummarize) {
        summaryDiv.innerText = "Unable to extract text from the file.";
        return;
      }

      const response = await fetch(
        "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer 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",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: textToSummarize }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "API request failed. Please check your input or try again later."
        );
      }

      const data = await response.json();
      const summaryText = data[0]?.summary_text;

      if (summaryText) {
        summaryDiv.innerText = summaryText;
      } else {
        summaryDiv.innerText =
          "Unable to generate a summary. Please try with a different text.";
      }
    } catch (error) {
      summaryDiv.innerText = `Error: ${
        error.message || "An unexpected error occurred."
      }`;
    }
  });

async function extractTextFromFile(file) {
  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return await extractTextFromWord(file);
  } else if (file.type === "text/plain") {
    return await extractTextFromTxt(file);
  } else {
    throw new Error(
      "Unsupported file type. Only Word documents, and TXT files are supported."
    );
  }
}

async function extractTextFromTxt(file) {
  const text = await file.text(); // Reads the content of the file as plain text
  return text;
}

async function extractTextFromWord(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Add event listener for the "Clear All" button
document.getElementById("clearButton").addEventListener("click", () => {
  // Clear the text input
  document.getElementById("inputText").value = "";

  // Clear the file input
  document.getElementById("fileInput").value = "";

  // Clear the summary text
  document.getElementById("summaryText").innerText = "";

  // Optionally reset the summary div styling or message
  document.getElementById("summaryText").innerText = "No summary available.";
});

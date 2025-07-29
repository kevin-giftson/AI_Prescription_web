// client/public/modules/ai.js

// Import necessary UI functions for displaying and interacting with suggestions
import { addMedicationToTableFromAI, addChip } from './ui.js';

/**
 * Initializes the AI logic by attaching an event listener to the patient form submission.
 * This function handles prompt generation, API calls to the server, and displaying AI responses.
 */
export function initializeAILogic() {
    document.getElementById('patientForm').addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission to handle it with JavaScript

        // Retrieve values from the form input fields
        const patientName = document.getElementById('patientName').value;
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;
        const symptoms = document.getElementById('symptoms').value;
        const pastMedicalHistory = document.getElementById('pastMedicalHistory').value;

        // Construct the detailed prompt for the AI model based on patient information.
        // The prompt explicitly requests a specific output format for Findings, Medications, and Lab Tests.
        const prompt = `
            Patient Information:
            Name: ${patientName}
            Age: ${age}
            Gender: ${gender}
            Symptoms: ${symptoms}
            Past Medical History/Long-term Problems: ${pastMedicalHistory || 'None'}

            Based on this information, provide potential medical findings, suitable medications, and required lab tests.
            **It is CRITICAL to adhere to the following specific output format and detail level for each section:**

            Findings:
            - [Concise Finding 1 (e.g., "Common Cold", "Possible Pneumonia", "Migraine")]
            - [Concise Finding 2]
            - [Concise Finding 3]
            (For Findings, provide ONLY short, specific names, WITHOUT any explanations or descriptions.)

            Medications:
            - **[Medication Name]**: [REQUIRED EXPLANATION: Briefly describe its primary use, mechanism of action, or specific relevance to the patient's condition and symptoms. For instance, "This medication is commonly used to relieve pain and reduce fever."]
            - **[Medication Name]**: [REQUIRED EXPLANATION: Briefly describe its primary use or relevance.]
            (Each medication MUST be bolded and FOLLOWED by a concise, relevant explanation.)

            Lab Tests:
            - **[Lab Test Name]**: [REQUIRED EXPLAINATION: Briefly describe what the test measures, its purpose, and its specific relevance to diagnosing or monitoring the patient's condition based on the provided information. For instance, "This test measures white blood cell count to detect infection or inflammation."]
            - **[Lab Test Name]**: [REQUIRED EXPLAINATION: Briefly describe what the test measures and its relevance.]
            (Each lab test MUST be bolded and FOLLOWED by a concise, relevant explanation.)

            Ensure all explanations are clear and directly relate to the patient's case.
        `;

        console.log("AI Prompt:\n", prompt);

        // Display loading messages in the UI while waiting for AI response
        document.getElementById('findingsList').innerHTML = 'Generating suggestions...';
        document.getElementById('medicationsList').innerHTML = 'Generating suggestions...';
        document.getElementById('labTestsList').innerHTML = 'Generating suggestions...';

        try {
            // Send the prompt to your backend API endpoint
            const response = await fetch('/api/get-ai-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            // Check if the HTTP response was successful
            if (!response.ok) {
                const errorData = await response.json(); // Attempt to parse error details from response
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json(); // Parse the JSON response from the server

            // Check for a specific error property in the JSON data (if the server sends it)
            if (data.error) {
                throw new Error(data.error);
            }

            const aiResponseText = data.aiText; // Extract the AI's generated text
            parseAndDisplaySuggestions(aiResponseText); // Process and display the AI's suggestions

        } catch (error) {
            // Handle any errors that occur during the API call or response parsing
            console.error('Error getting AI suggestions:', error);
            // Display an error message to the user in the UI
            document.getElementById('findingsList').innerHTML = `<p style="color: red;">Error generating suggestions: ${error.message}. Please ensure your backend is running.</p>`;
            document.getElementById('medicationsList').innerHTML = '';
            document.getElementById('labTestsList').innerHTML = '';
        }
    });
}


/**
 * Parses the AI's raw response text and dynamically displays suggestions
 * for findings, medications, and lab tests in the UI.
 * It also attaches click handlers to these suggestions.
 * @param {string} aiResponseText - The raw text response received from the AI.
 */
function parseAndDisplaySuggestions(aiResponseText) {
    console.log("AI Response Text received:", aiResponseText);

    const findingsListDiv = document.getElementById('findingsList');
    const medicationsListDiv = document.getElementById('medicationsList');
    const labTestsListDiv = document.getElementById('labTestsList');

    // Clear any previous suggestions or loading messages
    findingsListDiv.innerHTML = '';
    medicationsListDiv.innerHTML = '';
    labTestsListDiv.innerHTML = '';

    // Split the AI response into individual lines, trim whitespace, and filter out empty lines
    const lines = aiResponseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentSection = ''; // Tracks the current section being parsed (Findings, Medications, Lab Tests)
    lines.forEach(line => {
        // Identify the start of a new section based on keywords
        if (line.startsWith('Findings:')) {
            currentSection = 'finding';
        } else if (line.startsWith('Medications:')) {
            currentSection = 'medication';
        } else if (line.startsWith('Lab Tests:')) {
            currentSection = 'lab_test';
        } else if (line.startsWith('- ') && currentSection) { // Process lines that are list items within a section
            const fullLineContent = line.substring(2).trim(); // Remove the leading "- "

            let itemText; // This will be the clean name for the chip/table entry (e.g., "Paracetamol")
            let itemDescription = ''; // This will be the explanation part (e.g., "This medication is...")

            // Attempt to extract text within bold markdown (e.g., **Medication Name**)
            const boldMatch = fullLineContent.match(/\*\*(.*?)\*\*(?::)?\s*(.*)/); // Matches **name**: description OR **name** description
            if (boldMatch && boldMatch[1]) {
                itemText = boldMatch[1].trim(); // Extract the content inside ** **
                itemDescription = (boldMatch[2] || '').trim(); // Extract the description part
            } else {
                // Fallback if no bolding is found (e.g., for Findings, or if AI output deviates)
                const parts = fullLineContent.split(':');
                itemText = parts[0].trim();
                itemDescription = parts.slice(1).join(':').trim();
            }

            // Clean up itemText (for chip value) by removing any remaining markdown or trailing colon
            itemText = itemText.replace(/\*/g, '').trim();
            if (itemText.endsWith(':')) {
                itemText = itemText.slice(0, -1).trim();
            }

            // Determine the content to display. Findings are just the name; Medications/Lab Tests include descriptions.
            const displayContent = (currentSection === 'finding') ? fullLineContent : `${itemText}: ${itemDescription}`;

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('suggestion-item');
            itemDiv.innerHTML = displayContent; // Use innerHTML to preserve bolding if any
            itemDiv.dataset.type = currentSection; // Store the type (e.g., 'finding', 'medication')
            itemDiv.dataset.value = itemText; // Store the clean, short name for chip/table logic

            // Add click event listener to each suggestion item
            itemDiv.addEventListener('click', function () {
                const type = itemDiv.dataset.type;
                const value = itemDiv.dataset.value; // The clean name (e.g., "Acetaminophen")

                // Determine the correct UI container and hidden input ID based on the suggestion type
                let containerSuffix = '';
                if (type === 'finding') {
                    containerSuffix = 'Findings';
                } else if (type === 'medication') {
                    // For medications, call the specific UI function to add to the table
                    addMedicationToTableFromAI(value);
                    // Visually mark the original AI suggestion as selected
                    const originalSuggestionBlock = document.querySelector(`.suggestion-item[data-value="${value}"][data-type="${type}"]`);
                    if (originalSuggestionBlock) {
                        originalSuggestionBlock.classList.add('selected');
                    }
                    return; // Exit as chips are not used for medications
                } else if (type === 'lab_test') {
                    containerSuffix = 'LabTests';
                } else {
                    console.error("Unknown suggestion type encountered during click:", type);
                    return;
                }

                const containerId = `selected${containerSuffix}Chips`;
                const hiddenInputId = `final${containerSuffix}Input`;

                // Check if the item is already selected (has a chip)
                const container = document.getElementById(containerId);
                if (!container) {
                    console.error(`Error: Chip container with ID "${containerId}" not found.`);
                    return;
                }
                const existingChip = container.querySelector(`.chip[data-value="${value}"][data-type="${type}"]`);

                if (existingChip) {
                    // If already chipped, remove it (deselect)
                    existingChip.remove();
                    itemDiv.classList.remove('selected');
                } else {
                    // If not chipped, add it (select)
                    addChip(containerId, hiddenInputId, value, type); // Call ui.js's addChip function
                    itemDiv.classList.add('selected');
                }
            });

            // Append the suggestion item to the correct list container in the UI
            if (currentSection === 'finding') {
                findingsListDiv.appendChild(itemDiv);
            } else if (currentSection === 'medication') {
                medicationsListDiv.appendChild(itemDiv);
            } else if (currentSection === 'lab_test') {
                labTestsListDiv.appendChild(itemDiv);
            }
        }
    });
}
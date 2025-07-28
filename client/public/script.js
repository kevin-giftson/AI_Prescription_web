// script.js

let csvMedications = []; // To store medications loaded from CSV

// --- Helper Function ---
// Moved to the top to ensure it's defined before it's called
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to load medications from CSV
async function loadMedicationsCSV() {
    try {
        const response = await fetch('/medications.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        // Simple parsing: split by new line and filter out empty lines
        csvMedications = text.split('\n')
                                     .map(line => line.trim())
                                     .filter(line => line.length > 0 && !line.startsWith('//')); // Exclude comments
        console.log('Medications loaded from CSV:', csvMedications);
    } catch (error) {
        console.error('Error loading medications CSV:', error);
    }
}

// Load CSV on page load
document.addEventListener('DOMContentLoaded', loadMedicationsCSV);


// Function to add a chip to the specified container and update the hidden input
function addChip(containerId, hiddenInputId, text, type) {
    console.log(`Attempting to add chip: type="${type}", text="${text}" to containerId="${containerId}"`); // Debugging Line
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const inputField = container.querySelector('.chip-manual-input'); // The actual text input within the container

    // Prevent adding duplicates
    const existingChipValues = Array.from(container.querySelectorAll('.chip')).map(chip => chip.dataset.value);
    if (existingChipValues.includes(text)) {
        console.log(`"${text}" already in ${type} list.`);
        return;
    }

    const chip = document.createElement('div');
    chip.classList.add('chip');
    chip.dataset.value = text; // Store the actual value
    chip.dataset.type = type;   // Store the type for easy management

    const span = document.createElement('span');
    span.textContent = text;
    chip.appendChild(span);

    const removeButton = document.createElement('button');
    removeButton.classList.add('chip-remove');
    removeButton.textContent = 'x';
    removeButton.addEventListener('click', function() {
        chip.remove(); // Remove the chip from display
        updateHiddenInputValue(containerId, hiddenInputId); // Update hidden input
        // Also deselect the original AI suggestion item if it exists and was selected
        // Make sure the query for originalSuggestion matches data-type as well
        const originalSuggestion = document.querySelector(`.suggestion-item[data-value="${text}"][data-type="${type}"]`);
        if (originalSuggestion && originalSuggestion.classList.contains('selected')) {
            originalSuggestion.classList.remove('selected');
        }
        // Move focus back to the input field after removing a chip
        inputField.focus();
    });
    chip.appendChild(removeButton);

    // Insert the chip before the input field
    if (inputField) { // Add a check to ensure inputField exists
        container.insertBefore(chip, inputField);
    } else {
        container.appendChild(chip); // Fallback if inputField not found (shouldn't happen with current HTML)
    }
    
    updateHiddenInputValue(containerId, hiddenInputId); // Update hidden input
    console.log(`Chip successfully added for "${text}" of type "${type}".`); // Debugging Line
}

// Function to update the value of the hidden input field based on chips
function updateHiddenInputValue(containerId, hiddenInputId) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const chipValues = Array.from(container.querySelectorAll('.chip')).map(chip => chip.dataset.value);
    hiddenInput.value = chipValues.join(','); // Store as comma-separated string
    // console.log(`Updated ${hiddenInputId} to: ${hiddenInput.value}`); // Keep this line for debugging if needed
}

document.getElementById('patientForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const patientName = document.getElementById('patientName').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const symptoms = document.getElementById('symptoms').value;
    const pastMedicalHistory = document.getElementById('pastMedicalHistory').value;

    // Construct the prompt for the AI
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

    // Clear previous AI suggestions display and show loading messages
    document.getElementById('findingsList').innerHTML = 'Generating suggestions...';
    document.getElementById('medicationsList').innerHTML = 'Generating suggestions...';
    document.getElementById('labTestsList').innerHTML = 'Generating suggestions...';

    try {
        const response = await fetch('/api/get-ai-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const aiResponseText = data.aiText;
        parseAndDisplaySuggestions(aiResponseText);

    } catch (error) {
        console.error('Error getting AI suggestions:', error);
        document.getElementById('findingsList').innerHTML = `<p style="color: red;">Error generating suggestions: ${error.message}. Please ensure your backend is running.</p>`;
        document.getElementById('medicationsList').innerHTML = '';
        document.getElementById('labTestsList').innerHTML = '';
    }
});


// --- Parsing AI Suggestions and Handling Clicks ---
function parseAndDisplaySuggestions(aiResponseText) {
    console.log("AI Response Text received:", aiResponseText); // Debug 1

    const findingsListDiv = document.getElementById('findingsList');
    const medicationsListDiv = document.getElementById('medicationsList');
    const labTestsListDiv = document.getElementById('labTestsList');

    findingsListDiv.innerHTML = ''; // Clear previous suggestions
    medicationsListDiv.innerHTML = '';
    labTestsListDiv.innerHTML = '';

    const lines = aiResponseText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentSection = '';
    lines.forEach(line => {
        console.log("Processing line:", line); // Debug 2

        if (line.startsWith('Findings:')) {
            currentSection = 'finding'; // Keep as singular based on AI output format expectations
            console.log("Current section set to:", currentSection); // Debug 3
        } else if (line.startsWith('Medications:')) {
            currentSection = 'medication'; // Keep as singular
            console.log("Current section set to:", currentSection); // Debug 3
        } else if (line.startsWith('Lab Tests:')) {
            currentSection = 'lab_test'; // Keep as singular
            console.log("Current section set to:", currentSection); // Debug 3
        } else if (line.startsWith('- ') && currentSection) {
            const fullLineContent = line.substring(2).trim(); // Remove "- " and trim whitespace
            let itemText;
            let itemDescription = ''; // Will store the full explanation for display

            // Attempt to extract text within ** ** (the name) and the description
            const boldMatch = fullLineContent.match(/\*\*(.*?)\*\*(?::)?\s*(.*)/); // Matches **name**: description OR **name** description
            if (boldMatch && boldMatch[1]) {
                itemText = boldMatch[1].trim(); // Extract the content inside ** ** (the name)
                itemDescription = (boldMatch[2] || '').trim(); // Extract the description
            } else {
                // Fallback: if no bolding, or if it's just plain text, take the whole line for display
                // And the first part for the itemText (chip value)
                const parts = fullLineContent.split(':');
                itemText = parts[0].trim();
                itemDescription = parts.slice(1).join(':').trim(); // Rejoin if there were multiple colons
            }

            // Clean up itemText (for chip value) by removing any remaining markdown/extraneous characters
            itemText = itemText.replace(/\*/g, '').trim();
            if (itemText.endsWith(':')) { // In case fallback captured a trailing colon
                itemText = itemText.slice(0, -1).trim();
            }

            // For findings, the fullLineContent is just the name, so we use that directly.
            // For Medications/Lab Tests, itemText is the name, and we want to display fullLineContent (name + description)
            const displayContent = (currentSection === 'finding') ? fullLineContent : `${itemText}: ${itemDescription}`;

            console.log(`Extracted itemText (chip value) for ${currentSection}: "${itemText}"`); // Debug 4
            console.log(`Display content for ${currentSection}: "${displayContent}"`); // Debug 4.1

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('suggestion-item');
            
            // Set textContent to the full line for display, which includes the explanation
            // The itemText (just the name) is for the dataset.value for chipping
            itemDiv.innerHTML = displayContent; // Use innerHTML to preserve potential bolding/italics in the description itself
            
            itemDiv.dataset.type = currentSection; // 'finding', 'medication', 'lab_test'
            itemDiv.dataset.value = itemText; // Store only the clean name for chipping

            itemDiv.addEventListener('click', function() {
                console.log(`Clicked on a ${itemDiv.dataset.type} item: "${itemDiv.dataset.value}"`); // Debugging Line
                const type = itemDiv.dataset.type;
                const value = itemDiv.dataset.value; // This is the clean name (e.g., "Acetaminophen")

                // --- FIX: Map singular 'type' to plural HTML ID suffix ---
                let containerSuffix = '';
                if (type === 'finding') {
                    containerSuffix = 'Findings';
                } else if (type === 'medication') {
                    containerSuffix = 'Medications';
                } else if (type === 'lab_test') {
                    containerSuffix = 'LabTests';
                } else {
                    console.error("Unknown chip type encountered during click:", type);
                    return; // Prevent further errors
                }
                // --- END FIX ---

                // Determine the correct container and hidden input IDs based on mapped suffix
                const containerId = `selected${containerSuffix}Chips`; 
                const hiddenInputId = `final${containerSuffix}Input`;

                // Check if the item is already selected/chipped
                const container = document.getElementById(containerId); 
                // CRITICAL: Add a check for 'container' being null BEFORE calling querySelector
                if (!container) {
                    console.error(`Error: Container with ID "${containerId}" not found in the DOM.`);
                    return; // Stop execution if container is null
                }
                const existingChip = container.querySelector(`.chip[data-value="${value}"][data-type="${type}"]`); 

                if (existingChip) {
                    // If already chipped, remove it (deselect)
                    existingChip.remove();
                    itemDiv.classList.remove('selected');
                    console.log(`Chip removed for ${value}`); // Debug 5
                } else {
                    // If not chipped, add it (select)
                    addChip(containerId, hiddenInputId, value, type); // Pass the clean 'value' (itemText)
                    itemDiv.classList.add('selected');
                    console.log(`Chip added and item selected for ${value}`); // Debug 5
                }
                updateHiddenInputValue(containerId, hiddenInputId); // Ensure hidden input is updated
            });

            // Append to the correct list
            if (currentSection === 'finding') {
                findingsListDiv.appendChild(itemDiv);
                console.log("Appended to findingsListDiv:", itemText); // Debug 6
            } else if (currentSection === 'medication') {
                medicationsListDiv.appendChild(itemDiv);
                console.log("Appended to medicationsListDiv:", itemText); // Debug 6
            } else if (currentSection === 'lab_test') {
                labTestsListDiv.appendChild(itemDiv);
                console.log("Appended to labTestsListDiv:", itemText); // Debug 6
            }
        }
    });
}


// --- Manual Chip Input Logic ---
document.querySelectorAll('.chip-manual-input').forEach(inputField => {
    const type = inputField.dataset.type; // 'finding', 'medication', or 'lab_test'
    const container = inputField.closest('.text-input-chip-container');
    const autocompleteDropdown = container.querySelector('.autocomplete-dropdown');
    
    // --- FIX: Map singular 'type' to plural HTML ID suffix for manual input ---
    let containerSuffix = '';
    if (type === 'finding') {
        containerSuffix = 'Findings';
    } else if (type === 'medication') {
        containerSuffix = 'Medications';
    } else if (type === 'lab_test') {
        containerSuffix = 'LabTests';
    } else {
        console.error("Unknown chip type encountered in manual input setup:", type);
        return; 
    }
    const hiddenInputId = `final${containerSuffix}Input`;
    // --- END FIX ---

    let activeAutocompleteIndex = -1; // To track highlighted suggestion

    inputField.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        autocompleteDropdown.innerHTML = '';
        autocompleteDropdown.style.display = 'none';
        activeAutocompleteIndex = -1;

        if (query.length === 0) {
            return;
        }

        let allSuggestionsForType = [];

        // Add AI suggestions already on the page (from their data-value which is the clean name)
        const aiSuggestions = Array.from(document.getElementById(`${type}sList`).children)
                                                 .map(item => item.dataset.value);
        allSuggestionsForType.push(...aiSuggestions);

        // Add CSV medications for the 'medication' type
        if (type === 'medication') {
            allSuggestionsForType.push(...csvMedications);
        }

        // Remove duplicates and sort for cleaner autocomplete
        allSuggestionsForType = Array.from(new Set(allSuggestionsForType)).sort();

        const filteredSuggestions = allSuggestionsForType.filter(suggestion =>
            suggestion.toLowerCase().includes(query)
        ).slice(0, 5); // Limit to 5 suggestions

        if (filteredSuggestions.length > 0) {
            filteredSuggestions.forEach((sug, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('autocomplete-dropdown-item');
                itemDiv.textContent = sug; // Display the clean name
                itemDiv.addEventListener('click', () => {
                    addChip(container.id, hiddenInputId, sug, type);
                    inputField.value = ''; // Clear input after adding
                    autocompleteDropdown.innerHTML = '';
                    autocompleteDropdown.style.display = 'none';
                    // Visually mark the original AI suggestion as selected if it exists
                    const originalSuggestionBlock = document.querySelector(`.suggestion-item[data-value="${sug}"][data-type="${type}"]`);
                    if (originalSuggestionBlock) {
                        originalSuggestionBlock.classList.add('selected');
                    }
                    inputField.focus(); // Keep focus for continued typing
                });
                autocompleteDropdown.appendChild(itemDiv);
            });
            autocompleteDropdown.style.display = 'block';
        }
    });

    inputField.addEventListener('keydown', function(e) {
        const suggestions = autocompleteDropdown.querySelectorAll('.autocomplete-dropdown-item');
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeAutocompleteIndex = (activeAutocompleteIndex + 1) % suggestions.length;
                highlightAutocompleteSuggestion(suggestions, activeAutocompleteIndex);
                this.value = suggestions[activeAutocompleteIndex].textContent; // Auto-fill input with highlighted suggestion
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeAutocompleteIndex = (activeAutocompleteIndex - 1 + suggestions.length) % suggestions.length;
                highlightAutocompleteSuggestion(suggestions, activeAutocompleteIndex);
                this.value = suggestions[activeAutocompleteIndex].textContent; // Auto-fill input with highlighted suggestion
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeAutocompleteIndex > -1 && suggestions[activeAutocompleteIndex]) {
                suggestions[activeAutocompleteIndex].click(); // Click highlighted suggestion
            } else if (this.value.trim().length > 0) {
                // If no suggestion highlighted, add typed text as a new chip
                addChip(container.id, hiddenInputId, this.value.trim(), type);
                this.value = ''; // Clear input
                autocompleteDropdown.innerHTML = '';
                autocompleteDropdown.style.display = 'none';
            }
        } else if (e.key === 'Escape') {
            autocompleteDropdown.innerHTML = '';
            autocompleteDropdown.style.display = 'none';
            activeAutocompleteIndex = -1;
        } else if (e.key === 'Backspace' && this.value.trim() === '') {
            // Allow backspace to remove the last chip if input is empty
            const lastChip = container.querySelector('.chip:last-child');
            // Ensure lastChip is actually a chip and not the input field itself
            if (lastChip && lastChip !== inputField) {
                lastChip.remove();
                updateHiddenInputValue(container.id, hiddenInputId);
                // Also deselect the original AI suggestion item
                const originalSuggestion = document.querySelector(`.suggestion-item[data-value="${lastChip.dataset.value}"][data-type="${lastChip.dataset.type}"]`);
                if (originalSuggestion && originalSuggestion.classList.contains('selected')) {
                    originalSuggestion.classList.remove('selected');
                }
            }
        }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            autocompleteDropdown.innerHTML = '';
            autocompleteDropdown.style.display = 'none';
            activeAutocompleteIndex = -1;
        }
    });
});

function highlightAutocompleteSuggestion(suggestions, index) {
    suggestions.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    }
);
    if (suggestions[index]) {
        suggestions[index].scrollIntoView({ block: 'nearest' });
    }
}
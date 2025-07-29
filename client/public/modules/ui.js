// client/public/modules/ui.js

// Import necessary constants and data from the utils module
import { MEDICATION_TYPES, csvMedications } from './utils.js';

// Global array to store medication objects for the table.
// This array represents the state of the medications table UI.
export let medicationsTableData = [];

/**
 * Adds a visual "chip" to a specified container and updates a corresponding hidden input field.
 * @param {string} containerId - The ID of the container element where the chip will be added.
 * @param {string} hiddenInputId - The ID of the hidden input field to update.
 * @param {string} text - The text to display on the chip and store as its value.
 * @param {'finding'|'lab_test'|'medication'} type - The type of chip (used for data attributes).
 */
export function addChip(containerId, hiddenInputId, text, type) {
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
    removeButton.addEventListener('click', function () {
        chip.remove(); // Remove the chip from display
        updateHiddenInputValue(containerId, hiddenInputId); // Update hidden input
        // Also deselect the original AI suggestion item if it exists and was selected
        const originalSuggestion = document.querySelector(`.suggestion-item[data-value="${text}"][data-type="${type}"]`);
        if (originalSuggestion && originalSuggestion.classList.contains('selected')) {
            originalSuggestion.classList.remove('selected');
        }
        // Move focus back to the input field after removing a chip
        if (inputField) inputField.focus();
    });
    chip.appendChild(removeButton);

    // Insert the chip before the input field, or as a child if no input field is found
    if (inputField) {
        container.insertBefore(chip, inputField);
    } else {
        container.appendChild(chip);
    }

    updateHiddenInputValue(containerId, hiddenInputId);
}

/**
 * Updates the value of a hidden input field based on the values of chips in a container.
 * @param {string} containerId - The ID of the chip container.
 * @param {string} hiddenInputId - The ID of the hidden input field to update.
 */
export function updateHiddenInputValue(containerId, hiddenInputId) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const chipValues = Array.from(container.querySelectorAll('.chip')).map(chip => chip.dataset.value);
    hiddenInput.value = chipValues.join(','); // Store as comma-separated string
}

/**
 * Generates the HTML for the dosage input section based on the medication's type.
 * @param {object} medication - The medication object containing type and dosage details.
 * @returns {string} - The HTML string for the dosage input.
 */
function generateDosageHtml(medication) {
    let html = '';
    const dosage = medication.dosage || { morning: { active: false, meal: '', quantity: '' }, afternoon: { active: false, meal: '', quantity: '' }, evening: { active: false, meal: '', quantity: '' } };

    const isTabletLike = ["Tablet", "Capsule", "Lozenses"].includes(medication.type);
    const isSyrupLike = ["Mixtures", "Syrup"].includes(medication.type);

    if (isTabletLike || isSyrupLike) {
        const quantityInput = (time) => {
            if (isTabletLike) {
                return `<select class="dosage-quantity" data-time="${time}">
                            ${Array.from({ length: 5 }, (_, i) => i + 1).map(num => `<option value="${num}" ${dosage[time].quantity == num ? 'selected' : ''}>${num}</option>`).join('')}
                        </select> tablet(s)`;
            } else if (isSyrupLike) {
                const mlOptions = [5, 10, 15];
                return `<select class="dosage-quantity" data-time="${time}">
                            ${mlOptions.map(ml => `<option value="${ml}" ${dosage[time].quantity == ml ? 'selected' : ''}>${ml} ml</option>`).join('')}
                            <option value="manual" ${!mlOptions.includes(parseInt(dosage[time].quantity)) && dosage[time].quantity !== '' ? 'selected' : ''}>Other</option>
                        </select>
                        <input type="number" class="dosage-quantity-manual" data-time="${time}" placeholder="ml" style="width: 50px; ${!mlOptions.includes(parseInt(dosage[time].quantity)) && dosage[time].quantity !== '' ? '' : 'display: none;'}" value="${!mlOptions.includes(parseInt(dosage[time].quantity)) && dosage[time].quantity !== '' ? dosage[time].quantity : ''}">`;
            }
            return '';
        };

        const mealTiming = (time) => `
            <div class="meal-timing">
                <input type="radio" id="${medication.id}-${time}-after" name="${medication.id}-${time}-meal" value="after" ${dosage[time].meal === 'after' ? 'checked' : ''}>
                <label for="${medication.id}-${time}-after">After Meal</label>
                <input type="radio" id="${medication.id}-${time}-before" name="${medication.id}-${time}-meal" value="before" ${dosage[time].meal === 'before' ? 'checked' : ''}>
                <label for="${medication.id}-${time}-before">Before Meal</label>
            </div>
        `;

        html += `
            <div class="dosage-options">
                <div class="dosage-time">
                    <input type="checkbox" id="${medication.id}-morning" data-time="morning" ${dosage.morning.active ? 'checked' : ''}>
                    <label for="${medication.id}-morning">Morning</label>
                    ${dosage.morning.active ? quantityInput('morning') : ''}
                    ${dosage.morning.active ? mealTiming('morning') : ''}
                </div>
                <div class="dosage-time">
                    <input type="checkbox" id="${medication.id}-afternoon" data-time="afternoon" ${dosage.afternoon.active ? 'checked' : ''}>
                    <label for="${medication.id}-afternoon">Afternoon</label>
                    ${dosage.afternoon.active ? quantityInput('afternoon') : ''}
                    ${dosage.afternoon.active ? mealTiming('afternoon') : ''}
                </div>
                <div class="dosage-time">
                    <input type="checkbox" id="${medication.id}-evening" data-time="evening" ${dosage.evening.active ? 'checked' : ''}>
                    <label for="${medication.id}-evening">Evening</label>
                    ${dosage.evening.active ? quantityInput('evening') : ''}
                    ${dosage.evening.active ? mealTiming('evening') : ''}
                </div>
            </div>
        `;
    } else {
        html = `<textarea class="instruction-only-dosage" placeholder="Enter dosage details">${medication.dosage.instruction || ''}</textarea>`;
    }
    return html;
}

/**
 * Renders or re-renders the medications table based on the 'medicationsTableData' array.
 * This function updates the UI to reflect the current state of medications.
 */
export function renderMedicationsTable() {
    const tableBody = document.getElementById('medicationsTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    if (medicationsTableData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No medications added yet.</td></tr>';
        updateFinalMedicationsInput();
        return;
    }

    medicationsTableData.forEach((med, index) => {
        const row = tableBody.insertRow();
        med.id = med.id || Date.now() + '-' + index; // Ensure each row has a unique ID for dynamic updates

        row.innerHTML = `
            <td>${index + 1}</td>
            <td style="position: relative;"> <input type="text" class="med-name-input" value="${med.name || ''}">
                </td>
            <td>
                <select class="med-type-select">
                    ${MEDICATION_TYPES.map(type => `<option value="${type}" ${med.type === type ? 'selected' : ''}>${type}</option>`).join('')}
                </select>
            </td>
            <td class="dosage-cell" data-med-id="${med.id}">
                ${generateDosageHtml(med)}
            </td>
            <td>
                <select class="duration-number-select" style="width: 60px;">
                    ${Array.from({ length: 15 }, (_, i) => i + 1).map(num => `<option value="${num}" ${med.duration.number == num ? 'selected' : ''}>${num}</option>`).join('')}
                </select>
                <select class="duration-unit-select" style="width: 80px;">
                    <option value="days" ${med.duration.unit === 'days' ? 'selected' : ''}>days</option>
                    <option value="weeks" ${med.duration.unit === 'weeks' ? 'selected' : ''}>weeks</option>
                    <option value="months" ${med.duration.unit === 'months' ? 'selected' : ''}>months</option>
                </select>
            </td>
            <td><textarea class="instruction-textarea" rows="2" placeholder="Specific instructions">${med.instruction || ''}</textarea></td>
            <td class="action-buttons">
                <button type="button" class="delete-btn" data-index="${index}">Delete</button>
            </td>
        `;

        const medNameInput = row.querySelector('.med-name-input');
        medNameInput.addEventListener('input', (e) => {
            med.name = e.target.value;
            updateFinalMedicationsInput();
        });

        // --- NEW: Setup autocomplete for the medication name input ---
        setupAutocompleteForInput(
            medNameInput, // The input field
            csvMedications, // The array of suggestions (from medications.csv)
            (selectedName) => { // Callback when a suggestion is selected
                med.name = selectedName; // Update the medication object's name
                updateFinalMedicationsInput(); // Ensure the hidden form input is updated
            },
            'med' // A type identifier for the autocomplete, if needed for specific styling
        );
        // --- END NEW ---

        // Add event listeners for other inputs in the new row
        const typeSelect = row.querySelector('.med-type-select');
        typeSelect.addEventListener('change', (e) => {
            med.type = e.target.value;
            // Re-render only the dosage cell when type changes
            const dosageCell = row.querySelector('.dosage-cell');
            dosageCell.innerHTML = generateDosageHtml(med);
            attachDosageListeners(row, med); // Re-attach listeners for new dosage HTML
            updateFinalMedicationsInput();
        });

        attachDosageListeners(row, med); // Attach listeners for initial dosage HTML

        row.querySelector('.duration-number-select').addEventListener('change', (e) => {
            med.duration.number = parseInt(e.target.value);
            updateFinalMedicationsInput();
        });
        row.querySelector('.duration-unit-select').addEventListener('change', (e) => {
            med.duration.unit = e.target.value;
            updateFinalMedicationsInput();
        });
        row.querySelector('.instruction-textarea').addEventListener('input', (e) => {
            med.instruction = e.target.value;
            updateFinalMedicationsInput();
        });
        row.querySelector('.delete-btn').addEventListener('click', (e) => {
            deleteMedicationRow(parseInt(e.target.dataset.index));
        });
    });

    updateFinalMedicationsInput(); // Update hidden input after rendering
}

/**
 * Attaches event listeners to dosage-related input elements within a medication row.
 * @param {HTMLTableRowElement} row - The table row element for the medication.
 * @param {object} med - The medication object associated with the row.
 */
function attachDosageListeners(row, med) {
    const dosageCell = row.querySelector('.dosage-cell');

    dosageCell.querySelectorAll('input[type="checkbox"][data-time]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const time = e.target.dataset.time;
            med.dosage[time].active = e.target.checked;
            dosageCell.innerHTML = generateDosageHtml(med);
            attachDosageListeners(row, med); // Re-attach listeners for new HTML
            updateFinalMedicationsInput();
        });
    });

    dosageCell.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const time = e.target.name.split('-')[1];
            med.dosage[time].meal = e.target.value;
            updateFinalMedicationsInput();
        });
    });

    dosageCell.querySelectorAll('.dosage-quantity').forEach(select => {
        select.addEventListener('change', (e) => {
            const time = e.target.dataset.time;
            const manualInput = dosageCell.querySelector(`.dosage-quantity-manual[data-time="${time}"]`);
            if (e.target.value === 'manual') {
                if (manualInput) {
                    manualInput.style.display = 'inline-block';
                    manualInput.focus();
                    med.dosage[time].quantity = manualInput.value;
                }
            } else {
                if (manualInput) manualInput.style.display = 'none';
                med.dosage[time].quantity = parseInt(e.target.value);
            }
            updateFinalMedicationsInput();
        });
    });

    dosageCell.querySelectorAll('.dosage-quantity-manual').forEach(input => {
        input.addEventListener('input', (e) => {
            const time = e.target.dataset.time;
            med.dosage[time].quantity = parseInt(e.target.value) || '';
            updateFinalMedicationsInput();
        });
    });

    dosageCell.querySelectorAll('.instruction-only-dosage').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            med.dosage.instruction = e.target.value;
            updateFinalMedicationsInput();
        });
    });
}

/**
 * Adds a new empty medication row to the 'medicationsTableData' array and re-renders the table.
 * This function is typically called when the "Add New Medication" button is clicked.
 */
export function addNewMedicationRow() {
    const newMedication = {
        name: '',
        type: MEDICATION_TYPES[0], // Default to first type
        dosage: {
            morning: { active: false, meal: '', quantity: '' },
            afternoon: { active: false, meal: '', quantity: '' },
            evening: { active: false, meal: '', quantity: '' },
            instruction: '' // For 'other' types
        },
        duration: { number: 1, unit: 'days' },
        instruction: ''
    };
    medicationsTableData.push(newMedication);
    renderMedicationsTable();
}

/**
 * Deletes a medication row from the 'medicationsTableData' array by its index and re-renders the table.
 * @param {number} index - The index of the medication to delete.
 */
function deleteMedicationRow(index) {
    medicationsTableData.splice(index, 1);
    renderMedicationsTable();
}

/**
 * Adds an AI-suggested medication to the 'medicationsTableData' array and re-renders the table.
 * Prevents adding duplicates.
 * @param {string} medicationName - The name of the medication suggested by the AI.
 */
export function addMedicationToTableFromAI(medicationName) {
    // Check if medication already exists in the table to prevent duplicates
    const exists = medicationsTableData.some(med => med.name.toLowerCase() === medicationName.toLowerCase());
    if (exists) {
        console.log(`Medication "${medicationName}" already exists in the table.`);
        return;
    }

    const newMedication = {
        name: medicationName,
        type: MEDICATION_TYPES[0], // Default type
        dosage: {
            morning: { active: false, meal: '', quantity: '' },
            afternoon: { active: false, meal: '', quantity: '' },
            evening: { active: false, meal: '', quantity: '' },
            instruction: ''
        },
        duration: { number: 1, unit: 'days' },
        instruction: ''
    };
    medicationsTableData.push(newMedication);
    renderMedicationsTable();
    console.log(`Added AI suggested medication "${medicationName}" to table.`);
}

/**
 * Updates the value of the hidden input field that stores the JSON representation
 * of the 'medicationsTableData' array.
 */
export function updateFinalMedicationsInput() {
    const finalMedicationsInput = document.getElementById('finalMedicationsInput');
    if (finalMedicationsInput) {
        finalMedicationsInput.value = JSON.stringify(medicationsTableData);
    } else {
        console.warn("Element with ID 'finalMedicationsInput' not found.");
    }
}


// --- Autocomplete Logic for general inputs (used by Findings/Lab Tests chips and new Med Name input) ---

// Global map to store active autocomplete state for each input element
const activeAutocompleteStates = new Map(); // Stores { inputElement -> { index: -1, dropdownElement: div } }

/**
 * Highlights a specific suggestion item in an autocomplete dropdown.
 * @param {NodeList} suggestions - A NodeList of autocomplete suggestion items.
 * @param {number} index - The index of the item to highlight.
 */
function highlightAutocompleteSuggestion(suggestions, index) {
    suggestions.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
    if (suggestions[index]) {
        suggestions[index].scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Sets up autocomplete functionality for a given text input field.
 * @param {HTMLInputElement} inputElement - The input field to attach autocomplete to.
 * @param {string[]} suggestionsArray - An array of strings to use for suggestions (e.g., csvMedications).
 * @param {function(string): void} onSelectCallback - Callback function when a suggestion is selected.
 * @param {string} [type] - Optional type identifier (e.g., 'med', 'finding') for specific dropdown styling.
 */
function setupAutocompleteForInput(inputElement, suggestionsArray, onSelectCallback, type = '') {
    // Find the closest parent that can contain the dropdown relative to the input.
    // For table inputs, this will be the <td>. For chip inputs, it will be their main container.
    const parentContainer = inputElement.closest('.text-input-chip-container') || inputElement.closest('td');
    if (!parentContainer) {
        console.error("Parent container not found for autocomplete input.");
        return;
    }

    // Create or find the autocomplete dropdown
    let autocompleteDropdown = parentContainer.querySelector(`.autocomplete-dropdown[data-autocomplete-type="${type}"]`);
    if (!autocompleteDropdown) {
        autocompleteDropdown = document.createElement('div');
        autocompleteDropdown.classList.add('autocomplete-dropdown');
        if (type) autocompleteDropdown.dataset.autocompleteType = type; // Mark type for specific CSS
        parentContainer.appendChild(autocompleteDropdown); // Append to the appropriate parent
    }

    // Initialize state for this specific input field
    activeAutocompleteStates.set(inputElement, {
        index: -1,
        dropdown: autocompleteDropdown
    });

    // Event listener for input changes to trigger autocomplete
    inputElement.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        autocompleteDropdown.innerHTML = '';
        autocompleteDropdown.style.display = 'none';
        activeAutocompleteStates.get(inputElement).index = -1; // Reset active index

        if (query.length === 0) {
            return;
        }

        const filteredSuggestions = suggestionsArray.filter(suggestion =>
            suggestion.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to 10 suggestions

        if (filteredSuggestions.length > 0) {
            filteredSuggestions.forEach((sug, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('autocomplete-dropdown-item');
                itemDiv.textContent = sug;
                itemDiv.addEventListener('click', () => {
                    inputElement.value = sug;
                    onSelectCallback(sug); // Execute callback with the selected suggestion
                    autocompleteDropdown.innerHTML = '';
                    autocompleteDropdown.style.display = 'none';
                    inputElement.focus(); // Keep focus for easy continued typing
                });
                autocompleteDropdown.appendChild(itemDiv);
            });
            autocompleteDropdown.style.display = 'block'; // Show the dropdown
        }
    });

    // Event listener for keyboard navigation in autocomplete
    inputElement.addEventListener('keydown', function (e) {
        const state = activeAutocompleteStates.get(inputElement);
        const suggestions = state.dropdown.querySelectorAll('.autocomplete-dropdown-item');

        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent cursor from moving in input
                state.index = (state.index + 1) % suggestions.length;
                highlightAutocompleteSuggestion(suggestions, state.index);
                this.value = suggestions[state.index].textContent; // Auto-fill input with highlighted suggestion
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); // Prevent cursor from moving in input
                state.index = (state.index - 1 + suggestions.length) % suggestions.length;
                highlightAutocompleteSuggestion(suggestions, state.index);
                this.value = suggestions[state.index].textContent; // Auto-fill input with highlighted suggestion
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            if (state.index > -1 && suggestions[state.index]) {
                suggestions[state.index].click(); // Simulate click on highlighted suggestion
            } else if (this.value.trim().length > 0) {
                // If no suggestion highlighted but text is typed, use that text
                onSelectCallback(this.value.trim());
                autocompleteDropdown.innerHTML = '';
                autocompleteDropdown.style.display = 'none';
                this.blur(); // Remove focus after manual entry
            }
        } else if (e.key === 'Escape') {
            autocompleteDropdown.innerHTML = '';
            autocompleteDropdown.style.display = 'none';
            state.index = -1;
        }
    });

    // Hide dropdown when clicking outside the input or its parent container
    document.addEventListener('click', function (e) {
        if (!parentContainer.contains(e.target) && e.target !== inputElement) {
            autocompleteDropdown.innerHTML = '';
            autocompleteDropdown.style.display = 'none';
            state.index = -1;
        }
    });
}

/**
 * Initializes the logic for manual chip input fields (for Findings and Lab Tests),
 * including autocomplete suggestions and chip management.
 */
export function initializeManualChipInput() {
    document.querySelectorAll('.chip-manual-input').forEach(inputField => {
        const type = inputField.dataset.type; // 'finding' or 'lab_test'
        if (type !== 'finding' && type !== 'lab_test') return; // Only apply this specific setup to these types

        const container = inputField.closest('.text-input-chip-container');

        let containerSuffix = ''; // Used to construct the correct HTML ID for the hidden input
        if (type === 'finding') {
            containerSuffix = 'Findings';
        } else if (type === 'lab_test') {
            containerSuffix = 'LabTests';
        } else {
            console.error("Unknown chip type encountered in manual input setup:", type);
            return;
        }
        const hiddenInputId = `final${containerSuffix}Input`;

        // Setup autocomplete for this specific chip input
        setupAutocompleteForInput(
            inputField,
            // For findings/lab tests, suggestions come from what AI has already provided on the page
            // We gather these dynamically based on the .suggestion-item elements
            Array.from(document.querySelectorAll(`.suggestion-item[data-type="${type}"]`)).map(item => item.dataset.value),
            (selectedName) => {
                addChip(container.id, hiddenInputId, selectedName, type);
                inputField.value = ''; // Clear input after adding chip
                // Visually mark the original AI suggestion as selected if it exists
                const originalSuggestionBlock = document.querySelector(`.suggestion-item[data-value="${selectedName}"][data-type="${type}"]`);
                if (originalSuggestionBlock) {
                    originalSuggestionBlock.classList.add('selected');
                }
            },
            type // Pass type for specific dropdown styling if needed
        );

        // Additional keydown listener for backspace to remove last chip (specific to chip inputs)
        inputField.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace' && this.value.trim() === '') {
                const lastChip = container.querySelector('.chip:last-child');
                if (lastChip && lastChip.classList.contains('chip')) {
                    lastChip.remove();
                    updateHiddenInputValue(container.id, hiddenInputId);
                    const originalSuggestion = document.querySelector(`.suggestion-item[data-value="${lastChip.dataset.value}"][data-type="${lastChip.dataset.type}"]`);
                    if (originalSuggestion && originalSuggestion.classList.contains('selected')) {
                        originalSuggestion.classList.remove('selected');
                    }
                }
            }
        });
    });
}
// client/public/script.js (Main entry point for your client-side application)

// Import functions and data needed from other modules
import { loadMedicationsCSV } from './modules/utils.js';
import { renderMedicationsTable, addNewMedicationRow, initializeManualChipInput } from './modules/ui.js';
import { initializeAILogic } from './modules/ai.js';

/**
 * Executes when the entire HTML document has been loaded and parsed.
 * This is the primary initialization function for your client-side logic.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing application...");

    // 1. Load initial data (medications from CSV)
    loadMedicationsCSV();

    // 2. Render the medications table (might be empty initially)
    renderMedicationsTable();

    // 3. Initialize the core AI interaction logic (form submission, prompt generation)
    initializeAILogic();

    // 4. Set up manual input fields for Findings and Lab Tests with autocomplete and chip functionality
    initializeManualChipInput();

    // 5. Attach event listener for the "Add New Medication Row" button
    const addMedicationRowBtn = document.getElementById('addMedicationRowBtn');
    if (addMedicationRowBtn) {
        addMedicationRowBtn.addEventListener('click', addNewMedicationRow);
    } else {
        console.error("Button with ID 'addMedicationRowBtn' not found. Please ensure your HTML is correct.");
    }
});
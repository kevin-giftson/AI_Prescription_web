// client/public/modules/utils.js

/**
 * Capitalizes the first letter of a string.
 * @param {string} string
 * @returns {string}
 */
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Defines the standard medication types available for selection.
 */
export const MEDICATION_TYPES = [
    "Tablet", "Capsule", "Powder", "Lozenses", "Mixtures", "Lotion", "Drops",
    "Ointment", "Cream", "Inhaler", "Syrup", "Injection", "Oral Gel",
    "Oral Hygiene", "Insulin", "Soap", "Shampoo", "Gel", "Serum", "Solution"
];

/**
 * Global array to store medications loaded from the CSV file.
 * This array is exported so other modules can access the loaded data.
 * It's updated directly by loadMedicationsCSV.
 * @type {string[]}
 */
export let csvMedications = [];

/**
 * Loads medication names from the 'medications.csv' file.
 * Updates the 'csvMedications' array upon successful load.
 */
export async function loadMedicationsCSV() {
    try {
        const response = await fetch('/medications.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        // Parse CSV: split by new line, trim whitespace, filter out empty lines and comments.
        csvMedications = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('//'));
        console.log('Medications loaded from CSV (utils.js):', csvMedications.length, 'items');
    } catch (error) {
        console.error('Error loading medications CSV (utils.js):', error);
    }
}
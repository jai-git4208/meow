/**
 * simple profanity filter for chat messages
 * uses a basic word list and pattern matching
 */

// basic profanity word list (simplified for demo)
const profanityList = [
  'badword1', 'badword2', 'badword3'
  // Add more words as needed
];

/**
 * filter profanity from a message
 * @param {string} message the message to filter
 * @returns {string} filtered message with asterisks replacing bad words
 */
function filterProfanity(message) {
  let filtered = message;

  profanityList.forEach(word => {
    const regex = new RegExp(word, 'gi');
    const replacement = '*'.repeat(word.length);
    filtered = filtered.replace(regex, replacement);
  });

  return filtered;
}

/**
 * check if message contains profanity
 * @param {string} message  the message to check
 * @returns {boolean} true if profanity detected
 */
function hasProfanity(message) {
  const lowerMessage = message.toLowerCase();
  return profanityList.some(word => lowerMessage.includes(word));
}

module.exports = {
  filterProfanity,
  hasProfanity
};

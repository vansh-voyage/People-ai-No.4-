let hoverTimeout = null;
let activePopup = null; // To keep track of the currently displayed popup

// Track processed elements to ensure we only run the function once per element
const processedElements = new WeakSet();

// Function to send data to Flask backend
async function sendToBackend(productName) {
    try {
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: productName }),
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data);
        return data.result;
    } catch (error) {
        console.error("Error sending data to Flask:", error);
        return null;
    }
}

// Function to display the result near the product name
function displayResult(element, result) {
    if (activePopup) {
        activePopup.remove(); // Remove any existing popup
    }

    // Create popup div
    const resultDiv = document.createElement('div');
    resultDiv.style.position = 'absolute';
    resultDiv.style.backgroundColor = '#f9f9f9';
    resultDiv.style.border = '1px solid #ccc';
    resultDiv.style.padding = '10px';
    resultDiv.style.borderRadius = '8px';
    resultDiv.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    resultDiv.style.zIndex = '9999';
    resultDiv.style.maxWidth = '200px';  // Set max width for a compact design
    resultDiv.style.maxHeight = '150px'; // Restrict height to 150px
    resultDiv.style.overflowY = 'auto';  // Add vertical scrolling if content exceeds
    resultDiv.style.fontSize = '12px';   // Make the text smaller for compactness
    resultDiv.style.lineHeight = '1.5';  // Improve readability
    resultDiv.innerHTML = `<strong>Nutritional Info:</strong><br>${result}`;

    document.body.appendChild(resultDiv);

    // Position the popup near the product
    const rect = element.getBoundingClientRect();
    const popupWidth = resultDiv.offsetWidth;
    const popupHeight = resultDiv.offsetHeight;
    const offset = 10; // Distance from the element

    // Adjust position to ensure the popup doesn't overflow the screen
    let top = rect.top + window.scrollY - popupHeight - offset;
    let left = rect.left + window.scrollX + (rect.width - popupWidth) / 2;

    if (top < 0) top = rect.bottom + window.scrollY + offset;
    if (left < 0) left = offset;
    if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - offset;

    // Use requestAnimationFrame for smooth positioning
    requestAnimationFrame(() => {
        resultDiv.style.top = `${top}px`;
        resultDiv.style.left = `${left}px`;
    });

    activePopup = resultDiv; // Set the active popup to be removed later
}

// Function to handle hover event
async function handleHover(element) {
    if (!processedElements.has(element)) {
        // Find the product name within the hovered element
        let productNameElement = element.querySelector('.p13nTitle .a-truncate-full');
        if (!productNameElement) {
            // Handle the product name for search results
            productNameElement = element.querySelector('h2 a span, h2 span');
        }

        if (productNameElement) {
            const productName = productNameElement.innerText.trim(); // Extract product name
            if (productName) {
                const result = await sendToBackend(productName);
                if (result) {
                    displayResult(element, result);
                    processedElements.add(element); // Mark the element as processed
                }
            }
        }
    }
}

// Debounce function to handle hover with delay
function debounceHover(element, delay) {
    if (hoverTimeout) {
        clearTimeout(hoverTimeout);
    }
    hoverTimeout = setTimeout(() => {
        handleHover(element);
    }, delay);
}

// Attach hover event listener to the document
document.addEventListener('mouseover', (event) => {
    const targetElement = event.target.closest('.a-box-group, .s-result-item');
    if (targetElement) {
        debounceHover(targetElement, 500); // 500 ms delay before sending the request
    }
});

// Handle mouse out to clear the timeout and remove the popup
document.addEventListener('mouseleave', (event) => {
    const targetElement = event.target.closest('.a-box-group, .s-result-item');
    if (targetElement && activePopup) {
        activePopup.remove();
        activePopup = null; // Clear the active popup reference
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
    }
});

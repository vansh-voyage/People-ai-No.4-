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
        return data;
    } catch (error) {
        console.error("Error sending data to Flask:", error);
        return null;
    }
}

// Function to create a filled color ring (filled circle)
function createColorRing(color) {
    const ring = document.createElement('span');
    ring.style.display = 'inline-block';
    ring.style.width = '12px';
    ring.style.height = '12px';
    ring.style.backgroundColor = color; // Filled circle
    ring.style.borderRadius = '50%';
    ring.style.marginRight = '8px'; // Spacing between ring and text
    return ring;
}

// Function to display the result near the product name
function displayResult(element, result) {
    if (activePopup) {
        activePopup.remove(); // Remove any existing popup
    }

    // Extract data from the result
    const { product_name, classification_status, reasoning, conclusion, disclaimer } = result;

    // Determine classification color
    let classificationColor;
    switch (classification_status) {
        case 'GREEN':
            classificationColor = '#28a745'; // Bootstrap green
            break;
        case 'YELLOW':
            classificationColor = '#ffc107'; // Bootstrap yellow
            break;
        case 'RED':
            classificationColor = '#dc3545'; // Bootstrap red
            break;
        default:
            classificationColor = '#6c757d'; // Bootstrap gray for unknown
    }

    // Create popup div
    const resultDiv = document.createElement('div');
    resultDiv.style.position = 'absolute';
    resultDiv.style.background = 'linear-gradient(135deg, #e0e0e0, #cfcfcf)'; // Darker gradient background
    resultDiv.style.border = `2px solid ${classificationColor}`;
    resultDiv.style.padding = '20px'; // Increased padding for readability
    resultDiv.style.borderRadius = '12px';
    resultDiv.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)'; // Slightly darker shadow
    resultDiv.style.zIndex = '9999';
    resultDiv.style.maxWidth = '350px';  // Increased max width for better readability
    resultDiv.style.maxHeight = '280px'; // Increased height for better readability
    resultDiv.style.overflowY = 'auto';  // Add vertical scrolling if content exceeds
    resultDiv.style.fontSize = '15px';   // Adjust font size for better readability
    resultDiv.style.lineHeight = '1.8';  // Improve readability
    resultDiv.style.transition = 'opacity 0.3s ease-in-out'; // Smooth fade-in animation
    resultDiv.style.opacity = '0'; // Start hidden for fade-in effect

    // Create classification section with filled color ring
    const classificationSection = document.createElement('div');
    const colorRing = createColorRing(classificationColor); // Create the filled color ring element
    classificationSection.appendChild(colorRing); // Add the filled color ring to the classification section

    const classificationText = document.createElement('span');
    classificationText.innerHTML = `<strong style="color: black;">Classification:</strong> <span style="color: ${classificationColor};">${classification_status}</span>`; // Classification text is now black
    classificationSection.appendChild(classificationText);

    // Populate the popup with structured data
    resultDiv.innerHTML = `
        <strong style="font-size: 18px; color: #333;">Product:</strong> ${product_name} <br>
        <div id="classification-container"></div> <!-- Placeholder for classification -->
        <strong style="color: #555;">Reasoning:</strong> <span style="color: #444;">${reasoning}</span> <br>
        <strong style="color: #555;">Conclusion:</strong> <span style="color: #444;">${conclusion}</span> <br>
        <small style="color: #777;"><em>${disclaimer}</em></small>
    `;

    // Insert classification section at the placeholder
    resultDiv.querySelector('#classification-container').appendChild(classificationSection);

    document.body.appendChild(resultDiv);

    // Position the popup near the product
    const rect = element.getBoundingClientRect();
    const popupWidth = resultDiv.offsetWidth;
    const popupHeight = resultDiv.offsetHeight;
    const offset = 10; // Distance from the element

    let top = rect.top + window.scrollY - popupHeight - offset;
    let left = rect.left + window.scrollX + (rect.width - popupWidth) / 2;

    if (top < 0) top = rect.bottom + window.scrollY + offset;
    if (left < 0) left = offset;
    if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - offset;

    // Use requestAnimationFrame for smooth positioning
    requestAnimationFrame(() => {
        resultDiv.style.top = `${top}px`;
        resultDiv.style.left = `${left}px`;
        resultDiv.style.opacity = '1'; // Trigger the fade-in effect
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

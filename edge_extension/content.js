// let hoverTimeout = null;
// let activePopup = null; // To keep track of the currently displayed popup

// // Track processed elements to ensure we only run the function once per element
// const processedElements = new WeakSet();

// // Function to send data to Flask backend
// async function sendToBackend(productName) {
//     try {
//         const response = await fetch('http://127.0.0.1:5000/analyze', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({ query: productName }),
//         });
//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }
//         const data = await response.json();
//         console.log(data);
//         return data;  // Return full JSON response
//     } catch (error) {
//         console.error("Error sending data to Flask:", error);
//         return null;
//     }
// }

// // Function to get the color based on the classification status
// function getStatusColor(status) {
//     switch (status) {
//         case 'GREEN':
//             return '#28a745'; // Green for healthy
//         case 'YELLOW':
//             return '#ffc107'; // Yellow for moderate
//         case 'RED':
//             return '#dc3545'; // Red for unhealthy
//         default:
//             return '#6c757d'; // Gray for unknown statuses
//     }
// }

// // Function to display the result near the product name
// function displayResult(element, result) {
//     if (activePopup) {
//         activePopup.remove(); // Remove any existing popup
//     }

//     const { product_name, classification_status, conclusion, reasoning, disclaimer } = result;

//     // Create popup div with advanced styling
//     const resultDiv = document.createElement('div');
//     resultDiv.style.position = 'absolute';
//     resultDiv.style.backgroundColor = '#ffffff';  // Clean white background
//     resultDiv.style.border = '1px solid #ddd';    // Soft border for definition
//     resultDiv.style.padding = '20px';
//     resultDiv.style.borderRadius = '15px';        // Rounded corners for modern look
//     resultDiv.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)'; // Enhanced shadow for depth
//     resultDiv.style.zIndex = '9999';
//     resultDiv.style.maxWidth = '380px';  // Increased width for better content fit
//     resultDiv.style.maxHeight = '350px'; // More room for content
//     resultDiv.style.overflowY = 'auto';  // Scrollable if content exceeds height
//     resultDiv.style.fontFamily = 'Roboto, Arial, sans-serif';  // Modern font for clean look
//     resultDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';  // Smooth transitions
//     resultDiv.style.opacity = '0';  // Start with 0 opacity for fade-in effect
//     resultDiv.style.transform = 'translateY(10px)';  // Start with slight offset for animation

//     // Create a background gradient for a more professional, eye-catching look
//     resultDiv.style.background = 'linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%)';

//     // Apply classy typography and spacing with enhanced headings and layout
//     const popupContent = `
//         <div style="margin-bottom: 15px; font-size: 16px; font-weight: 700; color: #333;">${product_name}</div>
//         <div style="margin-bottom: 15px; display: flex; align-items: center;">
//             <span style="font-size: 14px; color: #555;">Classification Status:</span>
//             <span style="font-size: 14px; margin-left: 8px; padding: 5px 12px; border-radius: 8px; background-color: ${getStatusColor(classification_status)}; color: white; font-weight: bold;">
//                 ${classification_status}
//             </span>
//         </div>
//         <div style="margin-bottom: 15px;">
//             <strong style="font-size: 14px; color: #444;">Conclusion:</strong> 
//             <p style="font-size: 14px; color: #222; margin-top: 5px; line-height: 1.6;">${conclusion}</p>
//         </div>
//         <div style="margin-bottom: 15px;">
//             <strong style="font-size: 14px; color: #444;">Reasoning:</strong>
//             <p style="font-size: 14px; color: #222; margin-top: 5px; line-height: 1.6;">${reasoning}</p>
//         </div>
//         <div style="font-size: 12px; color: #999; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
//             <em>${disclaimer}</em>
//         </div>
//     `;

//     resultDiv.innerHTML = popupContent;
//     document.body.appendChild(resultDiv);

//     // Position the popup near the product
//     const rect = element.getBoundingClientRect();
//     const popupWidth = resultDiv.offsetWidth;
//     const popupHeight = resultDiv.offsetHeight;
//     const offset = 10; // Distance from the element

//     let top = rect.top + window.scrollY - popupHeight - offset;
//     let left = rect.left + window.scrollX + (rect.width - popupWidth) / 2;

//     if (top < 0) top = rect.bottom + window.scrollY + offset;
//     if (left < 0) left = offset;
//     if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - offset;

//     // Use requestAnimationFrame for smooth positioning
//     requestAnimationFrame(() => {
//         resultDiv.style.top = `${top}px`;
//         resultDiv.style.left = `${left}px`;
//         resultDiv.style.opacity = '1';  // Fade in
//         resultDiv.style.transform = 'translateY(0)';  // Slide in effect
//     });

//     activePopup = resultDiv; // Set the active popup to be removed later
// }

// // Function to handle hover event
// async function handleHover(element) {
//     if (!processedElements.has(element)) {
//         // Find the product name within the hovered element
//         let productNameElement = element.querySelector('.p13nTitle .a-truncate-full');
//         if (!productNameElement) {
//             // Handle the product name for search results
//             productNameElement = element.querySelector('h2 a span, h2 span');
//         }

//         if (productNameElement) {
//             const productName = productNameElement.innerText.trim(); // Extract product name
//             if (productName) {
//                 const result = await sendToBackend(productName);
//                 if (result) {
//                     displayResult(element, result);
//                     processedElements.add(element); // Mark the element as processed
//                 }
//             }
//         }
//     }
// }

// // Debounce function to handle hover with delay
// function debounceHover(element, delay) {
//     if (hoverTimeout) {
//         clearTimeout(hoverTimeout);
//     }
//     hoverTimeout = setTimeout(() => {
//         handleHover(element);
//     }, delay);
// }

// // Attach hover event listener to the document
// document.addEventListener('mouseover', (event) => {
//     const targetElement = event.target.closest('.a-box-group, .s-result-item');
//     if (targetElement) {
//         debounceHover(targetElement, 500); // 500 ms delay before sending the request
//     }
// });

// // Handle mouse out to clear the timeout and remove the popup
// document.addEventListener('mouseleave', (event) => {
//     const targetElement = event.target.closest('.a-box-group, .s-result-item');
//     if (targetElement && activePopup) {
//         activePopup.style.opacity = '0';  // Fade-out effect
//         activePopup.style.transform = 'translateY(10px)';  // Slide out effect
//         setTimeout(() => {
//             if (activePopup) activePopup.remove();  // Remove after animation completes
//             activePopup = null; // Clear the active popup reference
//         }, 300);
//         if (hoverTimeout) {
//             clearTimeout(hoverTimeout);
//             hoverTimeout = null;
//         }
//     }
// });


let activePopup = null; // Track the currently displayed popup

// Track processed elements to ensure we only run the function once per element
const processedElements = new WeakSet();

// Function to send data to Flask backend
async function sendToBackend(productName) {
    try {
        const response = await fetch('https://abhaytyagi.pythonanywhere.com/', {
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
        return data;  // Return the full JSON response from the backend
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
    resultDiv.style.background = 'linear-gradient(135deg, #e0e0e0, #cfcfcf)'; // Gradient background
    resultDiv.style.border = `2px solid ${classificationColor}`;
    resultDiv.style.padding = '20px';
    resultDiv.style.borderRadius = '12px';
    resultDiv.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)'; // Drop shadow for depth
    resultDiv.style.zIndex = '9999';
    resultDiv.style.maxWidth = '350px';
    resultDiv.style.maxHeight = '280px';
    resultDiv.style.overflowY = 'auto';
    resultDiv.style.fontSize = '15px';
    resultDiv.style.lineHeight = '1.8';
    resultDiv.style.opacity = '0'; // Start hidden for fade-in effect
    resultDiv.style.transition = 'opacity 0.3s ease-in-out';

    // Create classification section with filled color ring
    const classificationSection = document.createElement('div');
    const colorRing = createColorRing(classificationColor);
    classificationSection.appendChild(colorRing);

    const classificationText = document.createElement('span');
    classificationText.innerHTML = `<strong style="color: black;">Classification:</strong> <span style="color: ${classificationColor};">${classification_status}</span>`;
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

    // Position the popup near the product and ensure it stays visible within the viewport
    const rect = element.getBoundingClientRect();
    const popupWidth = resultDiv.offsetWidth;
    const popupHeight = resultDiv.offsetHeight;
    const offset = 10; // Distance from the element

    let top = rect.top + window.scrollY - popupHeight - offset;
    let left = rect.left + window.scrollX + (rect.width - popupWidth) / 2;

    // Ensure the popup remains within the viewport
    if (top < window.scrollY) top = rect.bottom + window.scrollY + offset; // Adjust if going above viewport
    if (top + popupHeight > window.scrollY + window.innerHeight) top = window.scrollY + window.innerHeight - popupHeight - offset; // Adjust if going below viewport
    if (left < 0) left = offset; // Prevent left overflow
    if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - offset; // Prevent right overflow

    // Use requestAnimationFrame for smooth positioning
    requestAnimationFrame(() => {
        resultDiv.style.top = `${top}px`;
        resultDiv.style.left = `${left}px`;
        resultDiv.style.opacity = '1'; // Trigger the fade-in effect
    });

    activePopup = resultDiv; // Set the active popup to be removed later

    // Add event listener to remove the popup when clicking anywhere on the screen
    document.addEventListener('click', removePopupOnClickOutside, { once: true });
}

// Function to remove the popup when clicking outside of it
function removePopupOnClickOutside(event) {
    if (activePopup && !activePopup.contains(event.target)) {
        activePopup.remove();
        activePopup = null;
    }
}

// Right-click context menu option for sending API request
function handleRightClick(event) {
    const targetElement = event.target.closest('.a-box-group, .s-result-item');
    
    if (targetElement) {
        event.preventDefault(); // Prevent the default context menu

        // Add custom context menu option
        const contextMenu = document.createElement('div');
        contextMenu.style.position = 'absolute';
        contextMenu.style.backgroundColor = '#f9f9f9';
        contextMenu.style.border = '1px solid #ccc';
        contextMenu.style.padding = '10px';
        contextMenu.style.borderRadius = '8px';
        contextMenu.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
        contextMenu.style.zIndex = '10000';
        contextMenu.style.cursor = 'pointer';
        contextMenu.style.fontSize = '14px';
        contextMenu.innerText = 'Analyze Nutritional Info';

        // Position context menu
        contextMenu.style.top = `${event.pageY}px`;
        contextMenu.style.left = `${event.pageX}px`;
        document.body.appendChild(contextMenu);

        // Handle click on context menu option
        contextMenu.addEventListener('click', async () => {
            const productNameElement = targetElement.querySelector('.p13nTitle .a-truncate-full') || targetElement.querySelector('h2 a span, h2 span');
            if (productNameElement) {
                const productName = productNameElement.innerText.trim(); // Extract product name
                if (productName) {
                    const result = await sendToBackend(productName);
                    if (result) {
                        displayResult(targetElement, result);
                        processedElements.add(targetElement); // Mark the element as processed
                    }
                }
            }
            contextMenu.remove(); // Remove the context menu after click
        });

        // Remove the custom context menu if clicked outside
        document.addEventListener('click', () => {
            contextMenu.remove();
        }, { once: true });
    }
}

// Attach right-click event listener to the document
document.addEventListener('contextmenu', handleRightClick);


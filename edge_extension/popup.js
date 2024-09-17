document.getElementById('enable-btn').addEventListener('click', () => {
    // Show an alert message
    alert("Button Enabled!");

    // Change the button text
    document.getElementById('enable-btn').innerText = "Button Enabled";

    // Send a message to the Chrome runtime to enable the classifier
    chrome.runtime.sendMessage({ action: "enable_classifier" });

    // Close the popup window
    window.close();
});

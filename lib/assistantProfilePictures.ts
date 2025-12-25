// Profile picture URLs for assistants
// Edit the URLs here to add/update profile pictures for assistants
// Add entries in the format: "Assistant Name": "image-url"

export const assistantProfilePictures: Record<string, string> = {
  // Example format - replace with your assistant names and image URLs:
  // "John Smith": "https://example.com/john-smith.jpg",
  // "Sarah Johnson": "https://example.com/sarah-johnson.jpg",
  
  // Add your assistants below:
}

export function getAssistantProfilePicture(name: string): string | undefined {
  return assistantProfilePictures[name]
}

/* global chrome */

// Declare chrome variable to fix lint/correctness/noUndeclaredVariables error
const chrome = window.chrome

async function getADOSettings() {
  const result = await chrome.storage.local.get(["adoSettings"])
  return result.adoSettings || {}
}

async function saveADOSettings(settings) {
  await chrome.storage.local.set({ adoSettings: settings })
}

async function clearADOSettings() {
  await chrome.storage.local.remove(["adoSettings"])
  if (typeof window !== "undefined" && window.graphAuth) {
    await window.graphAuth.clearTokens()
  }
}

async function getTasksForDate(date) {
  try {
    if (typeof window === "undefined" || !window.graphStorage) {
      console.warn("Graph storage not available, returning empty array")
      return []
    }

    const allRecords = await window.graphStorage.fetchAllRecords()
    const groupedByDate = window.graphStorage.groupRecordsByDate(allRecords)
    return groupedByDate[date] || []
  } catch (error) {
    console.error("Error fetching tasks from Graph API:", error)
    // Fallback to empty array if Graph API fails
    return []
  }
}

async function saveTasksForDate(date, tasks) {
  try {
    if (typeof window === "undefined" || !window.graphStorage) {
      throw new Error("Graph storage not available")
    }

    const newTask = tasks[tasks.length - 1]
    if (!newTask) return

    const logData = {
      logId: Date.now(),
      projectName: newTask.workItem?.project || newTask.task,
      workItemId: newTask.workItem?.id || "",
      workItemType: newTask.workItem?.type || "",
      date: new Date(date + "T00:00:00Z").toISOString(),
      developerName: "Developer", // Could be made configurable
      hoursSpent: newTask.hours,
      minutesSpent: newTask.minutes,
      workItemURL: newTask.workItem?.id
        ? `https://dev.azure.com/${newTask.workItem.organization}/${newTask.workItem.project}/_workitems/edit/${newTask.workItem.id}`
        : "",
      description: newTask.description,
    }

    await window.graphStorage.insertRecord(logData)
  } catch (error) {
    console.error("Error saving task to Graph API:", error)
    throw error
  }
}

async function initializeGraphAuth() {
  try {
    if (typeof window === "undefined" || !window.graphAuth) {
      console.warn("Graph auth not available")
      return false
    }

    await window.graphAuth.getValidToken()
    return true
  } catch (error) {
    console.error("Graph API authentication failed:", error)
    return false
  }
}

if (typeof window !== "undefined") {
  window.getADOSettings = getADOSettings
  window.saveADOSettings = saveADOSettings
  window.clearADOSettings = clearADOSettings
  window.getTasksForDate = getTasksForDate
  window.saveTasksForDate = saveTasksForDate
  window.initializeGraphAuth = initializeGraphAuth
}

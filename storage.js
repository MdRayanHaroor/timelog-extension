// Declare chrome variable
const chrome = window.chrome

import graphClient from "./graph-api.js"

async function getADOSettings() {
  const result = await chrome.storage.local.get(["adoSettings"])
  return result.adoSettings || {}
}

async function saveADOSettings(settings) {
  await chrome.storage.local.set({ adoSettings: settings })
}

async function clearADOSettings() {
  await chrome.storage.local.remove(["adoSettings"])
}

async function getTasksForDate(date) {
  try {
    // Fetch all logs from OneDrive Excel
    const allLogs = await graphClient.fetchAllTimeLogs()

    // Filter logs by date
    const dateString = new Date(date).toISOString().split("T")[0]
    return allLogs.filter((log) => {
      const logDate = new Date(log.timestamp).toISOString().split("T")[0]
      return logDate === dateString
    })
  } catch (error) {
    console.error("Error fetching tasks from OneDrive:", error)
    // Fallback to empty array if Graph API fails
    return []
  }
}

async function saveTasksForDate(date, tasks) {
  // This function is now used differently - we'll add individual tasks via addTimeLog
  // For compatibility, we'll handle the case where new tasks need to be added
  try {
    const existingTasks = await getTasksForDate(date)
    const newTasks = tasks.filter((task) => !existingTasks.some((existing) => existing.timestamp === task.timestamp))

    // Add each new task to Excel
    for (const task of newTasks) {
      await graphClient.addTimeLog(task)
    }
  } catch (error) {
    console.error("Error saving tasks to OneDrive:", error)
    throw error
  }
}

async function addTimeLog(timeLog) {
  try {
    const logId = await graphClient.addTimeLog(timeLog)
    return logId
  } catch (error) {
    console.error("Error adding time log to OneDrive:", error)
    throw error
  }
}

window.getADOSettings = getADOSettings
window.saveADOSettings = saveADOSettings
window.clearADOSettings = clearADOSettings
window.getTasksForDate = getTasksForDate
window.saveTasksForDate = saveTasksForDate
window.addTimeLog = addTimeLog

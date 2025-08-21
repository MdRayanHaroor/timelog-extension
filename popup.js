document.addEventListener("DOMContentLoaded", () => {
  // Set default dates to today
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("taskDate").value = today
  document.getElementById("filterDate").value = today

  // Load tasks for today by default
  loadTasksForDate(today)

  // Add task form submission
  document.getElementById("addTaskForm").addEventListener("submit", (e) => {
    e.preventDefault()
    addTask()
  })

  // Filter date change
  document.getElementById("filterDate").addEventListener("change", (e) => {
    const selectedDate = e.target.value
    if (selectedDate) {
      loadTasksForDate(selectedDate)
    }
  })
})

async function addTask() {
  const date = document.getElementById("taskDate").value
  const taskName = document.getElementById("taskName").value
  const hours = Number.parseInt(document.getElementById("hours").value) || 0
  const minutes = Number.parseInt(document.getElementById("minutes").value) || 0

  // Validation
  if (!date || !taskName) {
    showMessage("Please fill in all required fields.", "error")
    return
  }

  if (hours === 0 && minutes === 0) {
    showMessage("Please enter at least 1 minute.", "error")
    return
  }

  try {
    // Get existing data
    const result = await window.chrome.storage.local.get([date])
    const existingTasks = result[date] || []

    // Add new task
    const newTask = {
      task: taskName,
      hours: hours,
      minutes: minutes,
      timestamp: new Date().toISOString(),
    }

    existingTasks.push(newTask)

    // Save to storage
    await window.chrome.storage.local.set({
      [date]: existingTasks,
    })

    // Reset form
    document.getElementById("hours").value = "0"
    document.getElementById("minutes").value = "0"
    document.getElementById("taskName").value = ""

    // Show success message
    showMessage("Task added successfully!", "success")

    // Refresh the view if we're looking at the same date
    const filterDate = document.getElementById("filterDate").value
    if (filterDate === date) {
      loadTasksForDate(date)
    }
  } catch (error) {
    console.error("Error saving task:", error)
    showMessage("Error saving task. Please try again.", "error")
  }
}

async function loadTasksForDate(date) {
  try {
    const result = await window.chrome.storage.local.get([date])
    const tasks = result[date] || []

    displayTasks(tasks)
    displayDailyTotal(tasks)
  } catch (error) {
    console.error("Error loading tasks:", error)
    showMessage("Error loading tasks.", "error")
  }
}

function displayTasks(tasks) {
  const taskList = document.getElementById("taskList")

  if (tasks.length === 0) {
    taskList.innerHTML = '<p class="no-tasks">No tasks logged for this date</p>'
    return
  }

  const taskItems = tasks
    .map((task) => {
      const timeString = formatTime(task.hours, task.minutes)
      return `<div class="task-item">${task.task} - ${timeString}</div>`
    })
    .join("")

  taskList.innerHTML = taskItems
}

function displayDailyTotal(tasks) {
  const totalMinutes = tasks.reduce((total, task) => {
    return total + task.hours * 60 + task.minutes
  }, 0)

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const totalString = formatTime(hours, minutes)

  document.getElementById("dailyTotal").innerHTML = `<strong>Total Time Spent - ${totalString}</strong>`
}

function formatTime(hours, minutes) {
  return `${hours}h ${minutes}m`
}

function showMessage(message, type) {
  // Remove existing messages
  const existingMessage = document.querySelector(".success-message, .error-message")
  if (existingMessage) {
    existingMessage.remove()
  }

  // Create new message
  const messageDiv = document.createElement("div")
  messageDiv.className = type === "success" ? "success-message" : "error-message"
  messageDiv.textContent = message

  // Insert at the top of the add task section
  const addTaskSection = document.querySelector(".add-task-section")
  addTaskSection.insertBefore(messageDiv, addTaskSection.firstChild.nextSibling)

  // Remove message after 3 seconds
  setTimeout(() => {
    messageDiv.remove()
  }, 3000)
}

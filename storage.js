// storage.js

async function getADOSettings() {
  const result = await chrome.storage.local.get(["adoSettings"]);
  return result.adoSettings || {};
}

async function saveADOSettings(settings) {
  await chrome.storage.local.set({ adoSettings: settings });
}

async function clearADOSettings() {
  await chrome.storage.local.remove(["adoSettings"]);
}

// async function getTasksForDate(date) {
//   const result = await chrome.storage.local.get([date]);
//   return result[date] || [];
// }

async function getTasksForDate(date) {
  try {
    //const developer = "Rayan"; // or get dynamically from settings
    const developer = await getDeveloperName(); 
    if (!developer) throw new Error("Developer name not resolved");
    const response = await fetch(`http://localhost:7071/api/getLogs?date=${date}&developer=${developer}`);
    if (!response.ok) throw new Error(`Failed to fetch logs: ${response.status}`);
    const logs = await response.json();

    // Map API logs into extension format
    return logs.map(log => ({
      task: log.WorkItem || log.ProjectName,
      description: log.Description,
      workItem: {
        id: log.WorkItem,
        title: log.WorkItem,
        type: log.WorkItemType,
        organization: log.Organization || "",
        project: log.ProjectName,
        projectId: log.ProjectId || "",
      },
      hours: log.HoursSpent,
      minutes: log.MinutesSpent,
      timestamp: log.LogDate // DB date
    }));
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return [];
  }
}

// async function saveTasksForDate(date, tasks) {
//   await chrome.storage.local.set({ [date]: tasks });
// }

async function saveTasksForDate(date, tasks) {
  try {
    console.log("[saveTasksForDate] Received tasks:", tasks);

    const latestTask = tasks[tasks.length - 1];
    console.log("[saveTasksForDate] Latest task:", latestTask);

    const developer = await getDeveloperName();
    console.log("[saveTasksForDate] Resolved developer:", developer);

    if (!developer) throw new Error("Developer name not resolved");

    const payload = {
      ProjectName: latestTask.workItem?.project || "",
      WorkItem: latestTask.workItem?.id || latestTask.task,
      WorkItemType: latestTask.workItem?.type || "",
      LogDate: date,
      DeveloperName: developer,
      HoursSpent: latestTask.hours,
      MinutesSpent: latestTask.minutes,
      WorkItemURL: latestTask.workItem?.url ||
        `https://dev.azure.com/${latestTask.workItem?.organization}/${latestTask.workItem?.project}/_workitems/edit/${latestTask.workItem?.id}`,
      Description: latestTask.description
    };

    console.log("[saveTasksForDate] Payload sending to addLog:", payload);

    const response = await fetch("http://localhost:7071/api/addLog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("[saveTasksForDate] Response status:", response.status);
    const text = await response.text();
    console.log("[saveTasksForDate] Response body:", text);

    if (!response.ok) {
      throw new Error(`Failed to save task: ${response.status}`);
    }
  } catch (err) {
    console.error("[saveTasksForDate] Error saving task:", err);
    throw err;
  }
}



async function handleDeleteTask(timestamp) {
  alert("Delete not yet implemented — need backend /deleteLog API");
}

// Fetch current Azure DevOps profile
async function getADOProfile() {
  try {
    const res = await fetch("https://app.vssps.visualstudio.com/_apis/profile/profiles/me", {
      method: "GET",
      credentials: "include", // use logged-in cookies
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) throw new Error(`Failed to fetch ADO profile: ${res.status}`);
    const profile = await res.json();

    // Save locally for reuse
    await chrome.storage.local.set({ adoProfile: profile });

    return profile;
  } catch (err) {
    console.error("Error fetching ADO profile:", err);
    return null;
  }
}

// Load cached displayName (or fetch fresh if missing)
async function getDeveloperName() {
  try {
    // First try cache
    const cached = await chrome.storage.local.get(["adoProfile"]);
    if (cached?.adoProfile?.displayName) {
      return cached.adoProfile.displayName;
    }

    // Otherwise fetch live profile with cookies
    console.log("[getDeveloperName] fetching profile...");
    const res = await fetch(
      "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1-preview.3",
      {
        method: "GET",
        credentials: "include", // use logged-in cookies
        headers: { "Accept": "application/json" }
      }
    );
    console.log("[getDeveloperName] status:", res.status);
    if (!res.ok) throw new Error(`Failed to fetch ADO profile: ${res.status}`);
    const profile = await res.json();

    // cache it
    await chrome.storage.local.set({ adoProfile: profile });

    return profile.displayName;
  } catch (err) {
    console.error("Error in getDeveloperName:", err);
    return null;
  }
}



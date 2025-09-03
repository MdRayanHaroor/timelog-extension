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

async function getTasksForDate(date) {
  try {
    const developer = await getDeveloperName();
    if (!developer) throw new Error("Developer name not resolved");

    //`https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/getLogs?date=${date}&developer=${developer}`

    //const response = await fetch(`http://localhost:3000/api/getLogs?date=${date}&developer=${developer}`);
    //const response = await fetch(`http://localhost:7071/api/getLogs?date=${date}&developer=${developer}`);
    const response = await fetch(`https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/getLogs?date=${date}&developer=${developer}`);
    if (!response.ok) throw new Error(`Failed to fetch logs: ${response.status}`);

    const logs = await response.json();
    return logs.map(log => ({
      task: log.WorkItem || log.ProjectName,
      description: log.Description,
      workItem: {
        id: log.WorkItem,
        title: log.WorkItemTitle || log.WorkItem,
        type: log.WorkItemType,
        organization: log.Organization || "",
        project: log.ProjectName,
        projectId: log.ProjectId || "",
        state: log.WorkItemState || "",
        assignedTo: log.AssignedTo || "",
        iterationPath: log.IterationPath || "",
        tags: log.Tags || "",
        url: log.WorkItemURL || "",
        workItemDescription: log.WorkItemDescription || "",
      },
      hours: log.HoursSpent,
      minutes: log.MinutesSpent,
      timestamp: log.LogDate,
      logId: log.Log_Id
    }));
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return [];
  }
}

// async function saveTasksForDate(date, tasks) {
//   try {
//     console.log("[saveTasksForDate] Received tasks:", tasks);
//     const latestTask = tasks[tasks.length - 1];
//     console.log("[saveTasksForDate] Latest task:", latestTask);

//     const developer = await getDeveloperName();
//     console.log("[saveTasksForDate] Resolved developer:", developer);
//     if (!developer) throw new Error("Developer name not resolved");

//     // Extra details for work item
//     const workItemDetails = await getWorkItemDetails(
//       latestTask.workItem?.id,
//       latestTask.workItem?.organization,
//       latestTask.workItem?.project
//     );
//     console.log('Fetched workItemDetails:', workItemDetails);

//     // hierarchy info
//     const hierarchy = await getWorkItemHierarchy(
//       latestTask.workItem?.id,
//       latestTask.workItem?.organization,
//       latestTask.workItem?.project
//     );

//     const payload = {
//       Log_Id: latestTask.logId || null,
//       ProjectName: latestTask.workItem?.project || "",
//       WorkItem: latestTask.workItem?.id || latestTask.task,
//       WorkItemTitle: workItemDetails.title || latestTask.workItem?.title || latestTask.task,
//       WorkItemType: workItemDetails.type || latestTask.workItem?.type || "",
//       LogDate: date,
//       DeveloperName: developer,
//       HoursSpent: latestTask.hours,
//       MinutesSpent: latestTask.minutes,
//       WorkItemURL: latestTask.workItem?.url ||
//         `https://dev.azure.com/${latestTask.workItem?.organization}/${latestTask.workItem?.project}/_workitems/edit/${latestTask.workItem?.id}`,
//       Description: latestTask.description,
//       UserStoryId: hierarchy.userStory?.id || null,
//       UserStoryTitle: hierarchy.userStory?.title || null,
//       UserStoryDescription: hierarchy.userStory?.description || null,
//       FeatureId: hierarchy.feature?.id || null,
//       FeatureTitle: hierarchy.feature?.title || null,
//       EpicId: hierarchy.epic?.id || null,
//       EpicTitle: hierarchy.epic?.title || null,
//       WorkItemState: workItemDetails.state || null,
//       AssignedTo: workItemDetails.assignedTo || null,
//       IterationPath: workItemDetails.iterationPath || null,
//       Tags: workItemDetails.tags || null,
//       WorkItemDescription: workItemDetails.workItemDescription || null
//     };

//     console.log("[saveTasksForDate] Hierarchy info:", hierarchy);
//     console.log("[saveTasksForDate] Work item details:", workItemDetails);
//     console.log("[saveTasksForDate] Payload:", payload);

//     console.log("[saveTasksForDate] Payload sending to addLog:", payload);

//     const endpoint = payload.Log_Id 
//       ? "https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/updateLog"
//       : "https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/addLog";

//     //https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/addLog?

//     //http://localhost:7071/api/addLog
//     //const response = await fetch("http://localhost:3000/api/addLog", {
//     //const response = await fetch("http://localhost:7071/api/addLog", {
//     //const response = await fetch("https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/addLog", {
//     const response = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload)
//     });
//     console.log("[saveTasksForDate] Response status:", response.status);
//     const text = await response.text();
//     console.log("[saveTasksForDate] Response body:", text);
//     if (!response.ok) throw new Error(`Failed to save task: ${response.status}`);
//   } catch (err) {
//     console.error("[saveTasksForDate] Error saving task:", err);
//     throw err;
//   }
// }

// async function saveTasksForDate(date, tasks) {
//   try {
//     console.log("[saveTasksForDate] Received tasks:", tasks);
//     const latestTask = tasks[tasks.length - 1];
//     console.log("[saveTasksForDate] Latest task:", latestTask);

//     // For updates: we need the full context, not just the updated task
//     if (latestTask.logId) {
//       // This is an update - we need to get all tasks for the day to validate the total
//       const allTasks = await getTasksForDate(date);
//       const otherTasks = allTasks.filter(t => t.logId !== latestTask.logId);
//       const loggedMinutes = otherTasks.reduce((total, task) => total + (task.hours * 60) + task.minutes, 0);
//       const newEntryMinutes = (latestTask.hours * 60) + latestTask.minutes;
//       const totalMinutesLimit = 8 * 60;

//       if (loggedMinutes + newEntryMinutes > totalMinutesLimit) {
//         throw new Error("Update would exceed 8-hour daily limit");
//       }
//     }

//     let payload;
//     const endpoint = latestTask.logId 
//       ? "https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/updateLog"
//       : "https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/addLog";

//     if (latestTask.logId) {
//       // For updates: Minimal payload
//       payload = {
//         Log_Id: latestTask.logId,
//         HoursSpent: latestTask.hours,
//         MinutesSpent: latestTask.minutes,
//         Description: latestTask.description
//       };
//       console.log("[saveTasksForDate] Update mode - minimal payload:", payload);
//     } else {
//       // For adds: Full payload with fetches
//       const developer = await getDeveloperName();
//       console.log("[saveTasksForDate] Resolved developer:", developer);
//       if (!developer) throw new Error("Developer name not resolved");

//       const workItemDetails = await getWorkItemDetails(
//         latestTask.workItem?.id,
//         latestTask.workItem?.organization,
//         latestTask.workItem?.project
//       );
//       console.log('Fetched workItemDetails:', workItemDetails);

//       const hierarchy = await getWorkItemHierarchy(
//         latestTask.workItem?.id,
//         latestTask.workItem?.organization,
//         latestTask.workItem?.project
//       );
//       console.log("[saveTasksForDate] Hierarchy info:", hierarchy);

//       payload = {
//         Log_Id: null,
//         ProjectName: latestTask.workItem?.project || "",
//         WorkItem: latestTask.workItem?.id || latestTask.task,
//         WorkItemTitle: workItemDetails.title || latestTask.workItem?.title || latestTask.task,
//         WorkItemType: workItemDetails.type || latestTask.workItem?.type || "",
//         LogDate: date,
//         DeveloperName: developer,
//         HoursSpent: latestTask.hours,
//         MinutesSpent: latestTask.minutes,
//         WorkItemURL: latestTask.workItem?.url ||
//           `https://dev.azure.com/${latestTask.workItem?.organization}/${latestTask.workItem?.project}/_workitems/edit/${latestTask.workItem?.id}`,
//         Description: latestTask.description,
//         UserStoryId: hierarchy.userStory?.id || null,
//         UserStoryTitle: hierarchy.userStory?.title || null,
//         UserStoryDescription: hierarchy.userStory?.description || null,
//         FeatureId: hierarchy.feature?.id || null,
//         FeatureTitle: hierarchy.feature?.title || null,
//         EpicId: hierarchy.epic?.id || null,
//         EpicTitle: hierarchy.epic?.title || null,
//         WorkItemState: workItemDetails.state || null,
//         AssignedTo: workItemDetails.assignedTo || null,
//         IterationPath: workItemDetails.iterationPath || null,
//         Tags: workItemDetails.tags || null,
//         WorkItemDescription: workItemDetails.workItemDescription || null
//       };
//       console.log("[saveTasksForDate] Add mode - full payload:", payload);
//     }

//     const response = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload)
//     });
//     console.log("[saveTasksForDate] Response status:", response.status);
//     const text = await response.text();
//     console.log("[saveTasksForDate] Response body:", text);
//     if (!response.ok) throw new Error(`Failed to save task: ${response.status}`);
//   } catch (err) {
//     console.error("[saveTasksForDate] Error saving task:", err);
//     throw err;
//   }
// }

async function saveTasksForDate(date, tasks) {
  try {
    console.log("[saveTasksForDate] Received tasks:", tasks);
    const latestTask = tasks[tasks.length - 1];
    console.log("[saveTasksForDate] Latest task:", latestTask);

    let payload;
    const endpoint = latestTask.logId 
      ? "https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/updateLog"
      : "https://chrome-ext-timelogger-dbc8ctcbe8f7gpc4.centralindia-01.azurewebsites.net/api/addLog";

    if (latestTask.logId) {
      // For updates: Minimal payload
      payload = {
        Log_Id: latestTask.logId,
        HoursSpent: latestTask.hours,
        MinutesSpent: latestTask.minutes,
        Description: latestTask.description
      };
      console.log("[saveTasksForDate] Update mode - minimal payload:", payload);
    } else {
      // For adds: Full payload with fetches
      const developer = await getDeveloperName();
      console.log("[saveTasksForDate] Resolved developer:", developer);
      if (!developer) throw new Error("Developer name not resolved");

      // Get work item details with better error handling
      let workItemDetails = {};
      let hierarchy = { userStory: null, feature: null, epic: null };
      
      try {
        workItemDetails = await getWorkItemDetails(
          latestTask.workItem?.id,
          latestTask.workItem?.organization,
          latestTask.workItem?.project
        );
        console.log('Fetched workItemDetails:', workItemDetails);
      } catch (error) {
        console.error("[saveTasksForDate] Error fetching work item details:", error);
        // Continue with empty details but don't fail completely
      }

      try {
        hierarchy = await getWorkItemHierarchy(
          latestTask.workItem?.id,
          latestTask.workItem?.organization,
          latestTask.workItem?.project
        );
        console.log("[saveTasksForDate] Hierarchy info:", hierarchy);
      } catch (error) {
        console.error("[saveTasksForDate] Error fetching hierarchy:", error);
        // Continue with empty hierarchy but don't fail completely
      }

      payload = {
        Log_Id: null,
        ProjectName: latestTask.workItem?.project || "",
        WorkItem: latestTask.workItem?.id || latestTask.task,
        WorkItemTitle: workItemDetails.title || latestTask.workItem?.title || latestTask.task,
        WorkItemType: workItemDetails.type || latestTask.workItem?.type || "",
        LogDate: date,
        DeveloperName: developer,
        HoursSpent: latestTask.hours,
        MinutesSpent: latestTask.minutes,
        WorkItemURL: latestTask.workItem?.url ||
          `https://dev.azure.com/${latestTask.workItem?.organization}/${latestTask.workItem?.project}/_workitems/edit/${latestTask.workItem?.id}`,
        Description: latestTask.description,
        UserStoryId: hierarchy.userStory?.id || null,
        UserStoryTitle: hierarchy.userStory?.title || null,
        UserStoryDescription: hierarchy.userStory?.description || null,
        FeatureId: hierarchy.feature?.id || null,
        FeatureTitle: hierarchy.feature?.title || null,
        EpicId: hierarchy.epic?.id || null,
        EpicTitle: hierarchy.epic?.title || null,
        WorkItemState: workItemDetails.state || null,
        AssignedTo: workItemDetails.assignedTo || null,
        IterationPath: workItemDetails.iterationPath || null,
        Tags: workItemDetails.tags || null,
        WorkItemDescription: workItemDetails.workItemDescription || null
      };
      console.log("[saveTasksForDate] Add mode - full payload:", payload);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    console.log("[saveTasksForDate] Response status:", response.status);
    const text = await response.text();
    console.log("[saveTasksForDate] Response body:", text);
    
    if (!response.ok) throw new Error(`Failed to save task: ${response.status} - ${text}`);
    
  } catch (err) {
    console.error("[saveTasksForDate] Error saving task:", err);
    throw err;
  }
}

async function handleDeleteTask(timestamp) {
  alert("Delete not yet implemented — need backend /deleteLog API");
}

async function getADOProfile() {
  try {
    const res = await fetch(
      "https://app.vssps.visualstudio.com/_apis/profile/profiles/me",
      {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" }
      }
    );
    if (!res.ok) throw new Error(`Failed to fetch ADO profile: ${res.status}`);
    const profile = await res.json();
    await chrome.storage.local.set({ adoProfile: profile });
    return profile;
  } catch (err) {
    console.error("Error fetching ADO profile:", err);
    return null;
  }
}

async function getDeveloperName() {
  try {
    const cached = await chrome.storage.local.get(["adoProfile"]);
    if (cached?.adoProfile?.displayName) {
      return cached.adoProfile.displayName;
    }
    const res = await fetch(
      "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1-preview.3",
      {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" }
      }
    );
    if (!res.ok) throw new Error(`Failed to fetch ADO profile: ${res.status}`);
    const profile = await res.json();
    await chrome.storage.local.set({ adoProfile: profile });
    return profile.displayName;
  } catch (err) {
    console.error("Error in getDeveloperName:", err);
    return null;
  }
}

async function getWorkItemHierarchy(workItemId, organization, project) {
  try {
    let userStory = null, feature = null, epic = null;
    let currentId = workItemId;
    while (currentId) {
      const res = await fetch(
        `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${currentId}?$expand=relations&api-version=7.0`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Accept": "application/json" }
        }
      );
      if (!res.ok) throw new Error(`Failed to fetch work item ${currentId}`);
      const current = await res.json();
      const type = current.fields["System.WorkItemType"];
      const title = current.fields["System.Title"];
      const description = stripHtml(current.fields["System.Description"]);
      if (type === "User Story" && !userStory) userStory = { id: current.id, title, description };
      else if (type === "Feature" && !feature) feature = { id: current.id, title };
      else if (type === "Epic" && !epic) epic = { id: current.id, title };
      currentId = current.fields["System.Parent"] || null;
    }
    return { userStory, feature, epic };
  } catch (err) {
    console.error("[getWorkItemHierarchy] Error:", err);
    return { userStory: null, feature: null, epic: null };
  }
}

// Fetch all extra work item fields
async function getWorkItemDetails(workItemId, organization, project) {
  try {
    if (!workItemId || !organization || !project) return {};
    const res = await fetch(
      `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${workItemId}?api-version=7.0`,
      {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" }
      }
    );
    if (!res.ok) throw new Error("Failed to fetch work item details");
    const workItem = await res.json();
    return {
      title: workItem.fields?.["System.Title"] ?? null,
      type: workItem.fields?.["System.WorkItemType"] ?? null,
      state: workItem.fields?.["System.State"] ?? null,
      assignedTo: workItem.fields?.["System.AssignedTo"]?.displayName ?? null,
      iterationPath: workItem.fields?.["System.IterationPath"] ?? null,
      tags: workItem.fields?.["System.Tags"] ?? null,
      //workItemDescription: workItem.fields?.["System.Description"] ?? null
      workItemDescription: stripHtml(workItem.fields?.["System.Description"])
    };    
  } catch (err) {
    console.error("[getWorkItemDetails] Error:", err);
    return {};
  }
}

function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

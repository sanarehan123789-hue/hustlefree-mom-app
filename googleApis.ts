import { GoogleCalendarEvent, BudgetLog } from '../types';

/**
 * Fetch calendar events from Google Calendar API
 */
export async function fetchGoogleCalendarEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  try {
    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=15&orderBy=startTime&singleEvents=true`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error fetching calendar events:', errorText);
      throw new Error(`Google Calendar API returned status ${res.status}`);
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || 'Without Title',
      description: item.description,
      start: {
        dateTime: item.start?.dateTime || item.start?.date,
        date: item.start?.date,
      },
      end: {
        dateTime: item.end?.dateTime || item.end?.date,
        date: item.end?.date,
      },
    }));
  } catch (error) {
    console.error('fetchGoogleCalendarEvents failed:', error);
    throw error;
  }
}

/**
 * Add an event to primary Google Calendar
 */
export async function addGoogleCalendarEvent(
  accessToken: string,
  event: { summary: string; description: string; startDateTime: string; endDateTime: string }
): Promise<any> {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
    const body = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error adding event:', errText);
      throw new Error(`Failed to add event to Google Calendar: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('addGoogleCalendarEvent failed:', error);
    throw error;
  }
}

/**
 * Create a new spreadsheet in user's Drive called "HustleFree Mom Budget Logs"
 */
export async function createBudgetSpreadsheet(accessToken: string): Promise<string> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets`;
    const body = {
      properties: {
        title: 'HustleFree Mom Organizer - Budget Logs',
      },
      sheets: [
        {
          properties: {
            title: 'Budget Logs',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Date' } },
                    { userEnteredValue: { stringValue: 'Type (Income/Expense)' } },
                    { userEnteredValue: { stringValue: 'Category' } },
                    { userEnteredValue: { stringValue: 'Description' } },
                    { userEnteredValue: { stringValue: 'Amount ($)' } },
                    { userEnteredValue: { stringValue: 'Mom Profile Mode' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create spreadsheet: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.spreadsheetId;
  } catch (error) {
    console.error('createBudgetSpreadsheet failed:', error);
    throw error;
  }
}

/**
 * Log budget entry to Google Sheets (appends row)
 */
export async function appendBudgetLogToSheets(
  accessToken: string,
  spreadsheetId: string,
  log: BudgetLog
): Promise<any> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Budget Logs'!A:F:append?valueInputOption=USER_ENTERED`;
    const body = {
      values: [
        [
          log.date,
          log.type.toUpperCase(),
          log.category,
          log.description,
          log.amount,
          log.profile.toUpperCase(),
        ],
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to append log value to Google Sheets: ${res.status} - ${errText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('appendBudgetLogToSheets failed:', error);
    throw error;
  }
}

/**
 * Find or create the budget log spreadsheet in Google Drive so we don't spam creations
 */
export async function findBudgetSpreadsheet(accessToken: string): Promise<string | null> {
  try {
    // We use the Google Drive API v3 to list files with a specific query
    const query = encodeURIComponent("name = 'HustleFree Mom Organizer - Budget Logs' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.warn('Could not scan Google Drive. Attempting spreadsheet creation directly.');
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('findBudgetSpreadsheet failed:', error);
    return null;
  }
}

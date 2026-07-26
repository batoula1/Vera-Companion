import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Endpoint: Generate AI Emergency Summary using Gemini API
app.post('/api/generate-summary', async (req, res) => {
  try {
    const { 
      userName, 
      userEmail, 
      dateTime,
      gpsCoordinates, 
      medicalNotes, 
      safetyMode,
      trustedContactsCount,
      trustedContacts,
      triggerSource,
      checkInNote
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    const currentTimestamp = dateTime || new Date().toISOString();
    const formattedContacts = Array.isArray(trustedContacts) ? trustedContacts : [];
    const isCheckInExpired = triggerSource === 'SAFETY_CHECKIN_EXPIRED';
    const isSafeWalkExpired = triggerSource === 'SAFE_WALK_EXPIRED';
    const isTimerExpired = isCheckInExpired || isSafeWalkExpired;
    const incidentTypeName = isSafeWalkExpired 
      ? 'Safe Walk Trip Expired Alert' 
      : (isCheckInExpired ? 'Safety Check-In Expired Alert' : 'Emergency SOS Alert');

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Using fallback AI summary generator.');
      return res.json({
        success: true,
        summary: {
          incidentId: 'VERA-' + Math.floor(100000 + Math.random() * 900000),
          timestamp: currentTimestamp,
          incidentType: incidentTypeName,
          riskLevel: 'CRITICAL',
          summaryText: isTimerExpired
            ? `${incidentTypeName}. User ${userName || 'User'} did not respond to the arrival / check-in prompt. Emergency protocol initiated.`
            : `Emergency SOS triggered by ${userName || 'User'}. Immediate response protocols activated with ${trustedContactsCount || formattedContacts.length} trusted contacts notified.`,
          userContext: {
            userName: userName || 'VERA User',
            location: typeof gpsCoordinates === 'string' ? gpsCoordinates : (gpsCoordinates ? `Lat: ${gpsCoordinates.lat}, Lng: ${gpsCoordinates.lng}` : 'Location unavailable'),
            coordinates: typeof gpsCoordinates === 'object' ? gpsCoordinates : undefined,
            medicalNotes: medicalNotes || 'None declared',
            safetyMode: safetyMode || 'emergency'
          },
          keyFindings: [
            isTimerExpired ? `${incidentTypeName}: User did not respond.` : 'Immediate manual SOS trigger activated',
            checkInNote ? `User Context / Note: ${checkInNote}` : 'No optional note entered.',
            `GPS Status: ${typeof gpsCoordinates === 'string' ? gpsCoordinates : (gpsCoordinates ? 'Coordinates acquired' : 'Location unavailable')}`,
            `${trustedContactsCount || formattedContacts.length} emergency contacts alerted`
          ],
          recommendedActions: [
            'Attempt to reach user immediately via phone call',
            'Dispatch emergency contact or local responders to last known location',
            'Verify safety status and check destination / activity notes'
          ],
          notifiedContacts: formattedContacts,
          rawAiFormattedReport: `EMERGENCY DISPATCH REPORT\nUser: ${userName || 'User'}\nTime: ${currentTimestamp}\nStatus: ${isTimerExpired ? `${incidentTypeName} - Unresponsive` : 'Active SOS'}`
        }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are VERA Companion's AI Emergency Response Engine. ${isTimerExpired ? `A ${incidentTypeName} has occurred because the user DID NOT respond within 60 seconds to the arrival prompt.` : 'An Emergency SOS alert has been triggered by a user.'}
Analyze the following user emergency context and generate a structured JSON emergency report:

Trigger Cause: ${isTimerExpired ? `${incidentTypeName} - User did not respond` : 'Manual Emergency SOS'}
User Name: ${userName || 'User'}
Current Date & Time: ${currentTimestamp}
${checkInNote ? `User Context / Destination / Activity Note: "${checkInNote}"` : ''}
GPS Coordinates / Location: ${JSON.stringify(gpsCoordinates || 'Location unavailable')}
Emergency Medical Notes: ${medicalNotes || 'None'}
Safety Mode: ${safetyMode || 'emergency'}
Number of Trusted Contacts: ${trustedContactsCount || formattedContacts.length}
Trusted Contacts List: ${JSON.stringify(formattedContacts)}

Output ONLY valid JSON matching this exact structure:
{
  "incidentSummary": "string (2-3 concise sentences summarizing the emergency, location, and dispatch status. Highlight Check-In expired and user did not respond if applicable.)",
  "currentLocation": "string (readable address or GPS coordinates summary)",
  "riskLevel": "string (one of: Low, Medium, High, Critical)",
  "recommendedActions": ["string", "string", "string"],
  "medicalInformation": "string (summary of critical emergency medical notes or warnings)",
  "trustedContactsToNotify": ["string"],
  "timestamp": "string (ISO date string)"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {};
    }

    let locationString = (parsedData.currentLocation && !parsedData.currentLocation.includes('undefined')) 
      ? parsedData.currentLocation 
      : null;

    if (!locationString) {
      if (typeof gpsCoordinates === 'string') {
        locationString = gpsCoordinates;
      } else if (gpsCoordinates && typeof gpsCoordinates === 'object') {
        const lat = gpsCoordinates.latitude ?? gpsCoordinates.lat;
        const lng = gpsCoordinates.longitude ?? gpsCoordinates.lng;
        if (gpsCoordinates.address && !gpsCoordinates.address.includes('undefined')) {
          locationString = gpsCoordinates.address;
        } else if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          locationString = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        } else {
          locationString = 'Location unavailable due to denied permission.';
        }
      } else {
        locationString = 'Location unavailable due to denied permission.';
      }
    }

    let validCoordinates: { lat: number; lng: number } | undefined = undefined;
    if (gpsCoordinates && typeof gpsCoordinates === 'object') {
      const lat = gpsCoordinates.latitude ?? gpsCoordinates.lat;
      const lng = gpsCoordinates.longitude ?? gpsCoordinates.lng;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        validCoordinates = { lat, lng };
      }
    }

    // Standardize risk level to uppercase for badge styling ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
    let rawRisk = (parsedData.riskLevel || 'Critical').toUpperCase();
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawRisk)) {
      rawRisk = 'CRITICAL';
    }

    const fullSummary = {
      incidentId: 'VERA-' + Math.floor(100000 + Math.random() * 900000),
      timestamp: parsedData.timestamp || currentTimestamp,
      incidentType: 'Emergency SOS Alert',
      riskLevel: rawRisk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      summaryText: parsedData.incidentSummary || `Emergency SOS activated by ${userName || 'User'}. Rapid emergency response initiated.`,
      userContext: {
        userName: userName || 'VERA User',
        location: locationString,
        coordinates: validCoordinates,
        medicalNotes: parsedData.medicalInformation || medicalNotes || 'None declared',
        safetyMode: safetyMode || 'emergency'
      },
      keyFindings: [
        'Manual Emergency SOS button activated',
        `Location Status: ${locationString}`,
        `Trusted Contacts Alerted: ${trustedContactsCount || formattedContacts.length}`
      ],
      recommendedActions: parsedData.recommendedActions && parsedData.recommendedActions.length > 0 
        ? parsedData.recommendedActions 
        : [
            'Stay in a safe location',
            'Keep your phone near you and available for incoming emergency calls',
            'Await responder arrival or guardian verification'
          ],
      notifiedContacts: formattedContacts,
      rawAiFormattedReport: responseText
    };

    return res.json({ success: true, summary: fullSummary });
  } catch (error: any) {
    console.error('Error generating AI emergency summary:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate emergency report.' 
    });
  }
});

// Vite middleware for dev or Static serve for prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VERA Companion Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

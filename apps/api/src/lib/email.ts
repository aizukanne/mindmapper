import { Resend } from 'resend';

// Initialize Resend client (will be undefined if no API key)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'MindMapper <noreply@mindmapper.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 * Returns true if sent successfully, false if email is disabled or failed
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email:', options.subject);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('[Email] Failed to send:', error);
      return false;
    }

    console.log('[Email] Sent successfully:', options.subject);
    return true;
  } catch (err) {
    console.error('[Email] Error sending email:', err);
    return false;
  }
}

// ===================================
// Email Templates
// ===================================

export interface SuggestionNotificationData {
  treeName: string;
  treeId: string;
  suggesterName: string;
  suggesterEmail: string;
  personName: string;
  suggestionTitle: string;
  suggestionType: string;
  suggestionDescription?: string;
}

/**
 * Send notification to admins about a new suggestion
 */
export async function sendSuggestionNotification(
  adminEmails: string[],
  data: SuggestionNotificationData
): Promise<boolean> {
  if (adminEmails.length === 0) {
    return false;
  }

  const typeLabels: Record<string, string> = {
    UPDATE_PERSON: 'Update Information',
    ADD_RELATIONSHIP: 'Add Relationship',
    ADD_PERSON: 'Add Family Member',
    CORRECT_DATE: 'Date Correction',
    OTHER: 'Other',
  };

  const typeLabel = typeLabels[data.suggestionType] || data.suggestionType;
  const reviewUrl = `${APP_URL}/family-tree/${data.treeId}?tab=suggestions`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Suggestion for ${data.treeName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Suggestion Submitted</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">For ${data.treeName}</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #495057;">${data.suggestionTitle}</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d; width: 120px;">Type:</td>
          <td style="padding: 8px 0; font-weight: 500;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Person:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.personName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Submitted by:</td>
          <td style="padding: 8px 0; font-weight: 500;">${data.suggesterName} (${data.suggesterEmail})</td>
        </tr>
      </table>

      ${data.suggestionDescription ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; margin: 0 0 5px 0; font-size: 14px;">Description:</p>
        <p style="margin: 0; color: #333;">${data.suggestionDescription}</p>
      </div>
      ` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${reviewUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">Review Suggestion</a>
    </div>

    <p style="margin: 20px 0 0 0; font-size: 12px; color: #6c757d; text-align: center;">
      You're receiving this because you're an admin of ${data.treeName}.
    </p>
  </div>

  <div style="padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
    <p style="margin: 0;">MindMapper Family Tree</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
New Suggestion for ${data.treeName}

${data.suggestionTitle}

Type: ${typeLabel}
Person: ${data.personName}
Submitted by: ${data.suggesterName} (${data.suggesterEmail})
${data.suggestionDescription ? `\nDescription: ${data.suggestionDescription}` : ''}

Review this suggestion: ${reviewUrl}

---
You're receiving this because you're an admin of ${data.treeName}.
  `.trim();

  return sendEmail({
    to: adminEmails,
    subject: `New suggestion for ${data.treeName}: ${data.suggestionTitle}`,
    html,
    text,
  });
}

export interface SuggestionReviewedData {
  treeName: string;
  treeId: string;
  personName: string;
  suggestionTitle: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerName: string;
  reviewNote?: string;
}

/**
 * Send notification to suggester when their suggestion is reviewed
 */
export async function sendSuggestionReviewedNotification(
  suggesterEmail: string,
  data: SuggestionReviewedData
): Promise<boolean> {
  const statusLabel = data.status === 'APPROVED' ? 'Approved' : 'Rejected';
  const statusColor = data.status === 'APPROVED' ? '#28a745' : '#dc3545';
  const treeUrl = `${APP_URL}/family-tree/${data.treeId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Suggestion Has Been ${statusLabel}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${statusColor}; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Suggestion ${statusLabel}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${data.treeName}</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0 0 15px 0;">
        Your suggestion <strong>"${data.suggestionTitle}"</strong> for <strong>${data.personName}</strong> has been <span style="color: ${statusColor}; font-weight: bold;">${statusLabel.toLowerCase()}</span> by ${data.reviewerName}.
      </p>

      ${data.reviewNote ? `
      <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p style="color: #6c757d; margin: 0 0 5px 0; font-size: 14px;">Reviewer's note:</p>
        <p style="margin: 0; color: #333; font-style: italic;">"${data.reviewNote}"</p>
      </div>
      ` : ''}
    </div>

    <div style="text-align: center;">
      <a href="${treeUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Family Tree</a>
    </div>
  </div>

  <div style="padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
    <p style="margin: 0;">MindMapper Family Tree</p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Your Suggestion Has Been ${statusLabel}

Your suggestion "${data.suggestionTitle}" for ${data.personName} in ${data.treeName} has been ${statusLabel.toLowerCase()} by ${data.reviewerName}.
${data.reviewNote ? `\nReviewer's note: "${data.reviewNote}"` : ''}

View the family tree: ${treeUrl}

---
MindMapper Family Tree
  `.trim();

  return sendEmail({
    to: suggesterEmail,
    subject: `Your suggestion has been ${statusLabel.toLowerCase()}: ${data.suggestionTitle}`,
    html,
    text,
  });
}

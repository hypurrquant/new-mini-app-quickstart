import { NextResponse } from "next/server";

/**
 * Base App Chat Agent Webhook Handler
 * Follows Base App Agents UX Guidelines: https://docs.base.org/base-app/agents/building-quality-agents
 * 
 * Key requirements:
 * - Fast response times (< 5 seconds)
 * - Immediate feedback with reactions
 * - Multi-channel support (DM and group chats)
 * - Group chat etiquette (only respond when @mentioned or replied to)
 * - Human-like communication style
 */

type WebhookPayload = {
  type: string;
  data: {
    fid?: number;
    message?: {
      text?: string;
      mentions?: string[];
      replyTo?: string;
    };
    cast?: {
      text?: string;
      mentions?: Array<{ fid: number; username?: string }>;
      parentHash?: string;
    };
  };
};

/**
 * Check if agent should respond in group chat
 * Only respond when:
 * 1. Directly mentioned with "@" + agent name
 * 2. Replied to directly
 */
function shouldRespondInGroupChat(
  text: string,
  mentions: string[] | Array<{ fid: number; username?: string }> | undefined,
  replyTo: string | undefined,
  agentName: string = "lping"
): boolean {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  const lowerAgentName = agentName.toLowerCase();
  
  // Check for @mention
  if (lowerText.includes(`@${lowerAgentName}`)) {
    return true;
  }
  
  // Check mentions array
  if (mentions) {
    const mentionNames = mentions.map(m => 
      typeof m === 'string' ? m.toLowerCase() : m.username?.toLowerCase()
    );
    if (mentionNames.includes(lowerAgentName)) {
      return true;
    }
  }
  
  // Check if replied to agent's message
  if (replyTo) {
    return true;
  }
  
  return false;
}

/**
 * Generate onboarding message following Base App UX Guidelines
 */
function getOnboardingMessage(): string {
  return `hey, i'm lping. i help you track and manage your aerodrome concentrated liquidity positions on base. here's what i can do:

• check positions: see your LP positions, value, and performance. try "show my positions" or "check my LP"
• analyze performance: get insights on your earnings, APR, and price ranges
• get alerts: set up notifications for price changes or position updates
• share positions: easily share your LP positions with others

what do you want to do first?`;
}

/**
 * Parse user intent from message
 */
function parseIntent(text: string): {
  intent: 'check_positions' | 'onboarding' | 'help' | 'unknown';
  params?: Record<string, string>;
} {
  const lowerText = text.toLowerCase().trim();
  
  // Onboarding triggers
  if (lowerText.match(/^(hi|hello|hey|gm|start|help)$/)) {
    return { intent: 'onboarding' };
  }
  
  // Check positions
  if (lowerText.match(/(show|check|view|list|my).*(position|lp|liquidity)/)) {
    return { intent: 'check_positions' };
  }
  
  // Help
  if (lowerText.includes('help') || lowerText.includes('what can you')) {
    return { intent: 'help' };
  }
  
  return { intent: 'unknown' };
}

/**
 * Generate response based on intent
 */
function generateResponse(intent: string, fid?: number): {
  message: string;
  reaction?: string;
} {
  switch (intent) {
    case 'onboarding':
      return {
        message: getOnboardingMessage(),
        reaction: '👋',
      };
    
    case 'check_positions':
      return {
        message: `to check your LP positions, please connect your wallet at ${process.env.NEXT_PUBLIC_ROOT_URL || process.env.NEXT_PUBLIC_URL || 'https://lping.app'}/lp

once connected, i'll automatically show your aerodrome concentrated liquidity positions with real-time data on value, earnings, and APR.`,
        reaction: '👀',
      };
    
    case 'help':
      return {
        message: getOnboardingMessage(),
        reaction: '💡',
      };
    
    default:
      return {
        message: `i'm not sure what you mean. here's what i can help with:

• check your LP positions
• analyze performance
• set up alerts
• share positions

try "show my positions" or "help" for more info.`,
        reaction: '🤔',
      };
  }
}

export async function POST(request: Request) {
  try {
    // Fast response - send immediate acknowledgment
    // In production, you might want to send this as a reaction first
    
    const body = await request.json() as WebhookPayload;
    
    // Handle different webhook types
    if (body.type === 'message.created' || body.type === 'cast.created') {
      const message = body.data.message || body.data.cast;
      const text = message?.text || '';
      const mentions = message?.mentions;
      const replyTo = (message && 'replyTo' in message ? message.replyTo : undefined) || body.data.cast?.parentHash;
      const fid = body.data.fid;
      
      // For group chats, only respond when mentioned or replied to
      // For DMs, always respond
      const isGroupChat = mentions && mentions.length > 0;
      const shouldRespond = !isGroupChat || shouldRespondInGroupChat(text, mentions, replyTo);
      
      if (!shouldRespond) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      
      // Parse intent
      const { intent } = parseIntent(text);
      
      // Generate response
      const { message: responseMessage, reaction } = generateResponse(intent, fid);
      
      // Return response that Base App will send
      // Note: Actual implementation depends on Base App's webhook response format
      return NextResponse.json({
        ok: true,
        response: {
          message: responseMessage,
          reaction,
          // Quick actions for better UX
          quickActions: intent === 'onboarding' ? [
            { label: 'Check Positions', action: 'check_positions' },
            { label: 'View Analytics', action: 'analytics' },
            { label: 'Get Help', action: 'help' },
          ] : undefined,
        },
      });
    }
    
    // Handle other webhook types
    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    ok: true,
    service: 'LPing Chat Agent',
    version: '1.0.0',
    endpoints: {
      webhook: '/api/webhook',
    },
  });
}

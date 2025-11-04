"use client";
import { useState, useEffect } from "react";
import { getAttendanceData, canCheckInToday, checkIn, getTodayDateString } from "@/lib/points";

interface AttendanceCheckProps {
  darkMode: boolean;
  theme: {
    bg: string;
    bgSecondary: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    border: string;
    cardBg: string;
    gradient: string;
  };
}

export default function AttendanceCheck({ darkMode, theme }: AttendanceCheckProps) {
  const [attendanceData, setAttendanceData] = useState(getAttendanceData());
  const [isChecking, setIsChecking] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 컴포넌트 마운트 시 데이터 로드
    setAttendanceData(getAttendanceData());
  }, []);

  const handleCheckIn = () => {
    if (!canCheckInToday()) {
      setMessage("오늘은 이미 출석 체크를 했습니다!");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
      return;
    }

    setIsChecking(true);
    
    // 애니메이션을 위한 약간의 지연
    setTimeout(() => {
      const result = checkIn();
      setAttendanceData(getAttendanceData());
      setMessage(result.message);
      setShowMessage(true);
      setIsChecking(false);
      
      setTimeout(() => {
        setShowMessage(false);
      }, 4000);
    }, 500);
  };

  const canCheckIn = canCheckInToday();

  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      marginBottom: 16,
    }}>
      {/* 출석 체크 버튼 */}
      <div style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: showMessage ? `0 4px 12px ${theme.accent}40` : 'none',
      }}
      onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            fontSize: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 8,
            background: canCheckIn ? theme.gradient : theme.bgSecondary,
            opacity: canCheckIn ? 1 : 0.5,
          }}>
            ✅
          </div>
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
            }}>
              출석 체크
            </div>
            <div style={{
              fontSize: 12,
              color: theme.textSecondary,
            }}>
              {attendanceData.totalPoints} 포인트
              {attendanceData.consecutiveDays > 0 && ` • ${attendanceData.consecutiveDays}일 연속`}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (canCheckIn && !isChecking) {
              handleCheckIn();
            }
          }}
          disabled={!canCheckIn || isChecking}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: canCheckIn 
              ? (isChecking ? theme.bgSecondary : theme.gradient)
              : theme.bgSecondary,
            color: canCheckIn ? '#ffffff' : theme.textSecondary,
            cursor: canCheckIn && !isChecking ? 'pointer' : 'not-allowed',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.2s',
            opacity: canCheckIn ? 1 : 0.6,
            minWidth: 80,
          }}
          onMouseEnter={(e) => {
            if (canCheckIn && !isChecking) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isChecking ? '체크인 중...' : canCheckIn ? '체크인' : '완료'}
        </button>
      </div>

      {/* 메시지 표시 */}
      {showMessage && (
        <div style={{
          marginTop: 8,
          padding: '12px 16px',
          background: theme.accent,
          color: '#ffffff',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          animation: 'slideDown 0.3s ease-out',
        }}>
          {message}
        </div>
      )}

      {/* 상세 정보 (펼침) */}
      {isOpen && (
        <div style={{
          marginTop: 8,
          padding: 16,
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          animation: 'slideDown 0.3s ease-out',
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.text,
            marginBottom: 12,
          }}>
            출석 현황
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}>
            <div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: theme.accent,
              }}>
                {attendanceData.totalPoints}
              </div>
              <div style={{
                fontSize: 11,
                color: theme.textSecondary,
              }}>
                총 포인트
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: theme.accent,
              }}>
                {attendanceData.consecutiveDays}
              </div>
              <div style={{
                fontSize: 11,
                color: theme.textSecondary,
              }}>
                연속 출석
              </div>
            </div>
            <div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: theme.accent,
              }}>
                {attendanceData.checkHistory.length}
              </div>
              <div style={{
                fontSize: 11,
                color: theme.textSecondary,
              }}>
                총 출석일
              </div>
            </div>
          </div>
          
          {/* 포인트 획득 안내 */}
          <div style={{
            marginTop: 16,
            padding: 12,
            background: theme.bgSecondary,
            borderRadius: 8,
            fontSize: 12,
            color: theme.textSecondary,
            lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: theme.text }}>
              포인트 획득 방법:
            </div>
            <div>• 매일 출석 체크: 10 포인트</div>
            <div>• 연속 출석 (2일): 15 포인트</div>
            <div>• 연속 출석 (3일 이상): 25 포인트</div>
            <div>• 연속 출석 (7일 이상): 50 포인트</div>
          </div>
        </div>
      )}

      {/* 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}


// 포인트 시스템 유틸리티

export interface AttendanceData {
  lastCheckDate: string; // YYYY-MM-DD 형식
  consecutiveDays: number;
  totalPoints: number;
  checkHistory: string[]; // 출석 체크한 날짜들
}

const STORAGE_KEY = 'lping_points_data';

export function getAttendanceData(): AttendanceData {
  if (typeof window === 'undefined') {
    return {
      lastCheckDate: '',
      consecutiveDays: 0,
      totalPoints: 0,
      checkHistory: [],
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // 파싱 실패 시 기본값 반환
    }
  }

  return {
    lastCheckDate: '',
    consecutiveDays: 0,
    totalPoints: 0,
    checkHistory: [],
  };
}

export function saveAttendanceData(data: AttendanceData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function canCheckInToday(): boolean {
  const data = getAttendanceData();
  return data.lastCheckDate !== getTodayDateString();
}

export function checkIn(): { success: boolean; points: number; consecutiveDays: number; message: string } {
  const today = getTodayDateString();
  const data = getAttendanceData();

  // 이미 오늘 체크인 했는지 확인
  if (data.lastCheckDate === today) {
    return {
      success: false,
      points: 0,
      consecutiveDays: data.consecutiveDays,
      message: '오늘은 이미 출석 체크를 했습니다!',
    };
  }

  // 연속 출석 체크 계산
  let consecutiveDays = 1;
  let points = 10; // 기본 포인트

  if (data.lastCheckDate) {
    const lastDate = new Date(data.lastCheckDate);
    const todayDate = new Date(today);
    const diffTime = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // 연속 출석
      consecutiveDays = data.consecutiveDays + 1;
      
      // 연속 출석 보너스
      if (consecutiveDays >= 7) {
        points = 50; // 7일 연속 보너스
      } else if (consecutiveDays >= 3) {
        points = 25; // 3일 연속 보너스
      } else {
        points = 15; // 연속 출석 보너스
      }
    } else {
      // 연속 출석이 끊김
      consecutiveDays = 1;
      points = 10;
    }
  }

  // 업데이트된 데이터 저장
  const updatedData: AttendanceData = {
    lastCheckDate: today,
    consecutiveDays,
    totalPoints: data.totalPoints + points,
    checkHistory: [...data.checkHistory, today],
  };

  saveAttendanceData(updatedData);

  let message = `${points} 포인트를 획득했습니다!`;
  if (consecutiveDays > 1) {
    message += ` (${consecutiveDays}일 연속)`;
  }

  return {
    success: true,
    points,
    consecutiveDays,
    message,
  };
}


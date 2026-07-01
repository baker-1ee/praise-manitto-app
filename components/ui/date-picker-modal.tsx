import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
TouchableOpacity,
  View,
} from 'react-native';
import { AppColors } from '@/constants/theme';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DatePickerModal({ visible, value, minimumDate, onConfirm, onClose }: DatePickerModalProps) {
  const [cursor, setCursor] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const [selected, setSelected] = useState(value);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = startOfDay(new Date());
  const minDay = minimumDate ? startOfDay(minimumDate) : null;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  const handleDay = (day: number) => {
    const d = new Date(year, month, day);
    if (minDay && d < minDay) return;
    setSelected(d);
  };

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 월 네비게이션 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.navIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{year}년 {month + 1}월</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.navIcon}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 요일 헤더 */}
          <View style={styles.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={d} style={[styles.weekDay, i === 0 && styles.sunday]}>{d}</Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={styles.cell} />;
              const date = new Date(year, month, day);
              const isSelected = isSameDay(date, selected);
              const isToday = isSameDay(date, today);
              const disabled = minDay ? date < minDay : false;
              const isSun = i % 7 === 0;

              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                  onPress={() => handleDay(day)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText,
                    isSun && styles.sundayText,
                    isToday && !isSelected && styles.todayText,
                    isSelected && styles.selectedText,
                    disabled && styles.disabledText,
                  ]}>
                    {day}
                  </Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 버튼 */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Text style={styles.confirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    width: '100%',
    padding: 20,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 24,
    color: AppColors.textPrimary,
    lineHeight: 28,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  },

  // 요일
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  sunday: {
    color: '#E05C5C',
  },

  // 그리드
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: AppColors.primary,
    borderRadius: CELL_SIZE / 2,
  },
  dayText: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: '400',
  },
  sundayText: {
    color: '#E05C5C',
  },
  todayText: {
    color: AppColors.primary,
    fontWeight: '700',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledText: {
    color: AppColors.borderLight,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.primary,
    position: 'absolute',
    bottom: 4,
  },

  // 푸터
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primaryLight,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const parseNumber = (value, fallback = 0) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const countCalendarWeekendDays = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekendCount = 0;
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 5 || dow === 6) weekendCount += 1;
  }
  return { daysInMonth, weekendCount };
};

const computeRegular = (form) => {
  const { daysInMonth, weekendCount } = countCalendarWeekendDays(
    form.year,
    form.month,
  );

  let periodDays = form.customDays > 0 ? form.customDays : daysInMonth;
  periodDays = Math.max(0, Math.min(periodDays, daysInMonth));

  let weekendDays = form.manualWeekend
    ? form.weekendDays
    : weekendCount;
  weekendDays = Math.max(0, Math.min(weekendDays, periodDays));

  const weekdays = periodDays - weekendDays;
  const totalAssistants = form.totalAssistants;
  const includeCoordinator = form.includeCoordinator;
  const nonCoordCount = includeCoordinator
    ? Math.max(totalAssistants - 1, 0)
    : totalAssistants;

  const vacPerDayAssist = daysInMonth ? form.baseAssistMonth / daysInMonth : 0;
  const vacPerDayCoord = daysInMonth ? form.baseCoordMonth / daysInMonth : 0;

  const baselineAssistTotal = nonCoordCount * vacPerDayAssist * periodDays;
  const baselineCoordTotal = includeCoordinator
    ? vacPerDayCoord * periodDays
    : 0;
  const baselineTotal = baselineAssistTotal + baselineCoordTotal;

  const vacAssistHours = form.vacAssistDays * vacPerDayAssist;
  const vacCoordHours = includeCoordinator
    ? form.vacCoordDays * vacPerDayCoord
    : 0;
  const effectiveBaseline = baselineTotal - (vacAssistHours + vacCoordHours);

  const dayShiftHours =
    weekdays * form.assistWeekday * form.dayHours +
    weekendDays * form.assistWeekend * form.dayHours;

  const oncallHours = form.oncallCount * form.oncallHours;
  const requiredTotal = dayShiftHours + oncallHours;

  const overtime = requiredTotal - effectiveBaseline;
  const overtimeRounded = Math.round(overtime * 10) / 10;
  const descriptor =
    overtimeRounded > 5
      ? 'Net overtime required'
      : overtimeRounded < -5
      ? 'Under baseline capacity'
      : 'Close to baseline load';

  const ratio = effectiveBaseline ? requiredTotal / effectiveBaseline : 0;

  return {
    daysInMonth,
    weekendCount,
    periodDays,
    weekendDays,
    weekdays,
    vacPerDayAssist,
    vacPerDayCoord,
    baselineTotal,
    vacAssistHours,
    vacCoordHours,
    effectiveBaseline,
    dayShiftHours,
    oncallHours,
    requiredTotal,
    overtimeRounded,
    descriptor,
    loadRatio: ratio,
  };
};

const computeRamadan = (form) => {
  const totalDays = form.totalDays;
  let weekendDays = form.weekendDays;
  if (weekendDays > totalDays) weekendDays = totalDays;
  const weekdays = Math.max(totalDays - weekendDays, 0);

  const totalAssistants = form.totalAssistants;
  const includeCoordinator = form.includeCoordinator;
  const nonCoordCount = includeCoordinator
    ? Math.max(totalAssistants - 1, 0)
    : totalAssistants;

  const baseAssistPerDay = totalDays ? form.baseAssistMonth / totalDays : 0;
  const baseCoordPerDay = totalDays ? form.baseCoordMonth / totalDays : 0;

  const baselineAssistTotal = nonCoordCount * form.baseAssistMonth;
  const baselineCoordTotal = includeCoordinator ? form.baseCoordMonth : 0;
  const baselineTotal = baselineAssistTotal + baselineCoordTotal;

  const vacAssistHours = form.vacAssistDays * baseAssistPerDay;
  const vacCoordHours = includeCoordinator ? form.vacCoordDays * baseCoordPerDay : 0;
  const effectiveBaseline = baselineTotal - (vacAssistHours + vacCoordHours);

  const dayShiftHours =
    weekdays * form.assistWeekday * form.dayHours +
    weekendDays * form.assistWeekend * form.dayHours;
  const oncallHours = form.oncallCount * form.oncallHours;
  const requiredTotal = dayShiftHours + oncallHours;

  const overtime = requiredTotal - effectiveBaseline;
  const overtimeRounded = Math.round(overtime * 10) / 10;
  const descriptor =
    overtimeRounded > 5
      ? 'Net overtime required'
      : overtimeRounded < -5
      ? 'Under baseline capacity'
      : 'Close to baseline load';
  const ratio = effectiveBaseline ? requiredTotal / effectiveBaseline : 0;

  return {
    totalDays,
    weekendDays,
    weekdays,
    baseAssistPerDay,
    baseCoordPerDay,
    baselineTotal,
    vacAssistHours,
    vacCoordHours,
    effectiveBaseline,
    dayShiftHours,
    oncallHours,
    requiredTotal,
    overtimeRounded,
    descriptor,
    loadRatio: ratio,
  };
};

const computeMixed = (form) => {
  const includeCoordinator = form.includeCoordinator;
  const nonCoordCount = includeCoordinator
    ? Math.max(form.totalAssistants - 1, 0)
    : form.totalAssistants;

  let ramWeekend = form.ramWeekendDays;
  if (ramWeekend > form.ramDays) ramWeekend = form.ramDays;
  const ramWeekdays = Math.max(form.ramDays - ramWeekend, 0);

  let nonWeekend = form.nonWeekendDays;
  if (nonWeekend > form.nonDays) nonWeekend = form.nonDays;
  const nonWeekdays = Math.max(form.nonDays - nonWeekend, 0);

  const ramBaselineAssist = nonCoordCount * form.baseRamAssistPerDay * form.ramDays;
  const ramBaselineCoord = includeCoordinator
    ? form.baseRamCoordPerDay * form.ramDays
    : 0;
  const ramBaselineTotal = ramBaselineAssist + ramBaselineCoord;
  const ramVacAssistHours = form.ramVacAssistDays * form.baseRamAssistPerDay;
  const ramVacCoordHours = includeCoordinator
    ? form.ramVacCoordDays * form.baseRamCoordPerDay
    : 0;
  const ramVacHours = ramVacAssistHours + ramVacCoordHours;
  const ramEffBaseline = ramBaselineTotal - ramVacHours;

  const ramDayShift =
    ramWeekdays * form.ramAssistWeekday * form.ramDayHours +
    ramWeekend * form.ramAssistWeekend * form.ramDayHours;
  const ramOncallHours = form.ramOncallCount * form.ramOncallHours;
  const ramRequired = ramDayShift + ramOncallHours;
  const ramOvertime = ramRequired - ramEffBaseline;

  const nonBaselineAssist = nonCoordCount * form.baseNonAssistPerDay * form.nonDays;
  const nonBaselineCoord = includeCoordinator
    ? form.baseNonCoordPerDay * form.nonDays
    : 0;
  const nonBaselineTotal = nonBaselineAssist + nonBaselineCoord;
  const nonVacAssistHours = form.nonVacAssistDays * form.baseNonAssistPerDay;
  const nonVacCoordHours = includeCoordinator
    ? form.nonVacCoordDays * form.baseNonCoordPerDay
    : 0;
  const nonVacHours = nonVacAssistHours + nonVacCoordHours;
  const nonEffBaseline = nonBaselineTotal - nonVacHours;

  const nonDayShift =
    nonWeekdays * form.nonAssistWeekday * form.nonDayHours +
    nonWeekend * form.nonAssistWeekend * form.nonDayHours;
  const nonOncallHours = form.nonOncallCount * form.nonOncallHours;
  const nonRequired = nonDayShift + nonOncallHours;
  const nonOvertime = nonRequired - nonEffBaseline;

  const combinedBaseline = ramEffBaseline + nonEffBaseline;
  const combinedRequired = ramRequired + nonRequired;
  const combinedOvertime = combinedRequired - combinedBaseline;
  const combinedRounded = Math.round(combinedOvertime * 10) / 10;
  const descriptor =
    combinedRounded > 5
      ? 'Net overtime for mixed period'
      : combinedRounded < -5
      ? 'Under combined baseline capacity'
      : 'Close to combined baseline load';
  const ratio = combinedBaseline ? combinedRequired / combinedBaseline : 0;

  return {
    ramDays: form.ramDays,
    ramWeekend,
    ramWeekdays,
    ramVacHours,
    ramEffBaseline,
    ramRequired,
    ramOvertime,
    nonDays: form.nonDays,
    nonWeekend,
    nonWeekdays,
    nonVacHours,
    nonEffBaseline,
    nonRequired,
    nonOvertime,
    combinedBaseline,
    combinedRequired,
    combinedRounded,
    descriptor,
    loadRatio: ratio,
  };
};

const Field = ({ label, children, hint }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const NumberInput = ({ value, onChangeText, ...rest }) => (
  <TextInput
    value={String(value)}
    onChangeText={onChangeText}
    style={styles.input}
    keyboardType="numeric"
    placeholderTextColor="#9ca3af"
    {...rest}
  />
);

const ResultRow = ({ label, value, unit }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={styles.resultValue}>
      {value}
      {unit ? <Text style={styles.resultUnit}> {unit}</Text> : null}
    </Text>
  </View>
);

const TabButton = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabButton, active && styles.tabButtonActive]}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('regular');

  const [regForm, setRegForm] = useState({
    month: 11,
    year: 2025,
    customDays: '',
    weekendDays: 8,
    manualWeekend: false,
    totalAssistants: 13,
    includeCoordinator: true,
    baseAssistMonth: 176,
    baseCoordMonth: 158,
    vacAssistDays: 0,
    vacCoordDays: 0,
    assistWeekday: 6,
    assistWeekend: 4,
    dayHours: 9,
    oncallHours: 16,
    oncallCount: 0,
  });

  const [ramForm, setRamForm] = useState({
    totalDays: 30,
    weekendDays: 8,
    totalAssistants: 13,
    includeCoordinator: true,
    baseAssistMonth: 144,
    baseCoordMonth: 129,
    vacAssistDays: 0,
    vacCoordDays: 0,
    assistWeekday: 6,
    assistWeekend: 4,
    dayHours: 6,
    oncallHours: 18,
    oncallCount: 0,
  });

  const [mixForm, setMixForm] = useState({
    totalAssistants: 13,
    includeCoordinator: true,
    baseRamAssistPerDay: 4.8,
    baseRamCoordPerDay: 4.3,
    baseNonAssistPerDay: 5.9,
    baseNonCoordPerDay: 5.3,
    ramDays: 10,
    ramWeekendDays: 4,
    ramVacAssistDays: 0,
    ramVacCoordDays: 0,
    ramAssistWeekday: 6,
    ramAssistWeekend: 4,
    ramDayHours: 6,
    ramOncallHours: 18,
    ramOncallCount: 0,
    nonDays: 20,
    nonWeekendDays: 4,
    nonVacAssistDays: 0,
    nonVacCoordDays: 0,
    nonAssistWeekday: 6,
    nonAssistWeekend: 4,
    nonDayHours: 9,
    nonOncallHours: 16,
    nonOncallCount: 0,
  });

  const regularResults = useMemo(() => computeRegular(regForm), [regForm]);
  const ramadanResults = useMemo(() => computeRamadan(ramForm), [ramForm]);
  const mixedResults = useMemo(() => computeMixed(mixForm), [mixForm]);

  useEffect(() => {
    if (!regForm.manualWeekend) {
      const { weekendCount } = countCalendarWeekendDays(regForm.year, regForm.month);
      setRegForm((prev) => ({ ...prev, weekendDays: weekendCount }));
    }
  }, [regForm.month, regForm.year, regForm.manualWeekend]);

  const updateReg = (key, val) => {
    setRegForm((prev) => ({ ...prev, [key]: val }));
  };
  const updateRam = (key, val) => {
    setRamForm((prev) => ({ ...prev, [key]: val }));
  };
  const updateMix = (key, val) => {
    setMixForm((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🧮 NICU Overtime Suite</Text>
        <Text style={styles.subtitle}>
          Three calculators: regular Gregorian month, Ramadan-only, and mixed Ramadan + non-Ramadan periods.
        </Text>

        <View style={styles.tabBar}>
          <TabButton
            label="📊 Regular month"
            active={activeTab === 'regular'}
            onPress={() => setActiveTab('regular')}
          />
          <TabButton
            label="🌙 Ramadan month"
            active={activeTab === 'ramadan'}
            onPress={() => setActiveTab('ramadan')}
          />
          <TabButton
            label="🔄 Mixed period"
            active={activeTab === 'mixed'}
            onPress={() => setActiveTab('mixed')}
          />
        </View>

        {activeTab === 'regular' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📊 Regular Month Overtime</Text>
            <Text style={styles.sectionSubtitle}>
              Use calendar month defaults or enter a shorter active period.
            </Text>

            <View style={styles.section}>
              <Field label="Month (1-12) & year">
                <View style={styles.inlineInputs}>
                  <NumberInput
                    value={regForm.month}
                    onChangeText={(text) => updateReg('month', parseNumber(text, 1))}
                  />
                  <NumberInput
                    value={regForm.year}
                    onChangeText={(text) => updateReg('year', parseNumber(text, 2025))}
                  />
                </View>
                <Text style={styles.hint}>
                  Calendar days: {regularResults.daysInMonth} · Fridays/Saturdays: {regularResults.weekendCount}
                </Text>
              </Field>

              <Field label="Active days in this period (optional)" hint="Leave blank or 0 to use the full month.">
                <NumberInput
                  value={regForm.customDays}
                  onChangeText={(text) => updateReg('customDays', text === '' ? '' : parseNumber(text, 0))}
                />
              </Field>

              <Field label="Weekend days (Fri + Sat) in this period" hint="Toggle auto to use calendar weekends.">
                <View style={styles.inlineInputs}>
                  <NumberInput
                    value={regForm.weekendDays}
                    onChangeText={(text) => updateReg('weekendDays', parseNumber(text, 0))}
                  />
                  <TouchableOpacity
                    onPress={() => updateReg('manualWeekend', !regForm.manualWeekend)}
                    style={styles.toggle}
                  >
                    <Text style={styles.toggleText}>
                      {regForm.manualWeekend ? 'Manual' : 'Auto'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>

              <Field label="# assistant consultants (incl. coordinator)">
                <NumberInput
                  value={regForm.totalAssistants}
                  onChangeText={(text) => updateReg('totalAssistants', parseNumber(text, 0))}
                />
              </Field>

              <Field label="Schedule coordinator included?">
                <TouchableOpacity
                  onPress={() => updateReg('includeCoordinator', !regForm.includeCoordinator)}
                  style={[styles.toggle, regForm.includeCoordinator && styles.toggleActive]}
                >
                  <Text style={styles.toggleText}>
                    {regForm.includeCoordinator ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>🧮 Baseline hours</Text>
              <Field label="Assistant baseline hours / month">
                <NumberInput
                  value={regForm.baseAssistMonth}
                  onChangeText={(text) => updateReg('baseAssistMonth', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Coordinator baseline hours / month">
                <NumberInput
                  value={regForm.baseCoordMonth}
                  onChangeText={(text) => updateReg('baseCoordMonth', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>🏖️ Vacation (month)</Text>
              <Field label="Total vacation days – assistants">
                <NumberInput
                  value={regForm.vacAssistDays}
                  onChangeText={(text) => updateReg('vacAssistDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Vacation days – coordinator">
                <NumberInput
                  editable={regForm.includeCoordinator}
                  value={regForm.vacCoordDays}
                  onChangeText={(text) => updateReg('vacCoordDays', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>📋 Coverage pattern</Text>
              <Field label="Assistants per weekday (Sun–Thu)">
                <NumberInput
                  value={regForm.assistWeekday}
                  onChangeText={(text) => updateReg('assistWeekday', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Assistants per weekend day (Fri/Sat)">
                <NumberInput
                  value={regForm.assistWeekend}
                  onChangeText={(text) => updateReg('assistWeekend', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per day shift">
                <NumberInput
                  value={regForm.dayHours}
                  onChangeText={(text) => updateReg('dayHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per on-call">
                <NumberInput
                  value={regForm.oncallHours}
                  onChangeText={(text) => updateReg('oncallHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Number of on-calls in this period">
                <NumberInput
                  value={regForm.oncallCount}
                  onChangeText={(text) => updateReg('oncallCount', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <Text style={styles.resultsTitle}>Results</Text>
            <View style={styles.resultsCard}>
              <ResultRow
                label="Days used in calculation"
                value={regularResults.periodDays.toFixed(1)}
                unit="days"
              />
              <ResultRow
                label="Weekdays vs weekends"
                value={`${regularResults.weekdays.toFixed(1)} wk · ${regularResults.weekendDays.toFixed(1)} we`}
              />
              <ResultRow
                label="Baseline hours (before vacation)"
                value={regularResults.baselineTotal.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Vacation hours – assistants"
                value={regularResults.vacAssistHours.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Vacation hours – coordinator"
                value={regularResults.vacCoordHours.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Effective baseline after vacation"
                value={regularResults.effectiveBaseline.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Required hours – day shifts"
                value={regularResults.dayShiftHours.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Required hours – on-calls"
                value={regularResults.oncallHours.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Total required hours"
                value={regularResults.requiredTotal.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Group overtime (regular)"
                value={(regularResults.overtimeRounded > 0 ? '+' : '') + regularResults.overtimeRounded.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Load vs effective baseline"
                value={`${regularResults.loadRatio.toFixed(2)}× · ${regularResults.descriptor}`}
              />
            </View>
          </View>
        )}

        {activeTab === 'ramadan' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🌙 Ramadan NICU Overtime</Text>
            <Text style={styles.sectionSubtitle}>
              Ramadan-only calculator: baselines, vacations, coverage, and on-calls.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>📅 Ramadan basics</Text>
              <Field label="Total Ramadan days in this month">
                <NumberInput
                  value={ramForm.totalDays}
                  onChangeText={(text) => updateRam('totalDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Ramadan weekend days (Fri + Sat)">
                <NumberInput
                  value={ramForm.weekendDays}
                  onChangeText={(text) => updateRam('weekendDays', parseNumber(text, 0))}
                />
                <Text style={styles.hint}>
                  Weekdays auto: {ramadanResults.weekdays.toFixed(0)}
                </Text>
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>🧮 Baseline & vacation</Text>
              <Field label="# assistant consultants (incl. coordinator)">
                <NumberInput
                  value={ramForm.totalAssistants}
                  onChangeText={(text) => updateRam('totalAssistants', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Schedule coordinator included?">
                <TouchableOpacity
                  onPress={() => updateRam('includeCoordinator', !ramForm.includeCoordinator)}
                  style={[styles.toggle, ramForm.includeCoordinator && styles.toggleActive]}
                >
                  <Text style={styles.toggleText}>
                    {ramForm.includeCoordinator ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </Field>
              <Field label="Ramadan baseline hours / assistant (month)">
                <NumberInput
                  value={ramForm.baseAssistMonth}
                  onChangeText={(text) => updateRam('baseAssistMonth', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Ramadan baseline hours / coordinator (month)">
                <NumberInput
                  value={ramForm.baseCoordMonth}
                  onChangeText={(text) => updateRam('baseCoordMonth', parseNumber(text, 0))}
                />
              </Field>
              <View style={styles.inlineInputs}>
                <Text style={styles.inlineText}>
                  Baseline per day (assistant): {ramadanResults.baseAssistPerDay.toFixed(2)} h
                </Text>
              </View>
              <View style={styles.inlineInputs}>
                <Text style={styles.inlineText}>
                  Baseline per day (coordinator): {ramadanResults.baseCoordPerDay.toFixed(2)} h
                </Text>
              </View>
              <Field label="Total vacation days – all assistants">
                <NumberInput
                  value={ramForm.vacAssistDays}
                  onChangeText={(text) => updateRam('vacAssistDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Vacation days – coordinator">
                <NumberInput
                  editable={ramForm.includeCoordinator}
                  value={ramForm.vacCoordDays}
                  onChangeText={(text) => updateRam('vacCoordDays', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>📋 Coverage pattern (Ramadan)</Text>
              <Field label="Assistants per Ramadan weekday">
                <NumberInput
                  value={ramForm.assistWeekday}
                  onChangeText={(text) => updateRam('assistWeekday', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Assistants per Ramadan weekend day">
                <NumberInput
                  value={ramForm.assistWeekend}
                  onChangeText={(text) => updateRam('assistWeekend', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per day shift (Ramadan)">
                <NumberInput
                  value={ramForm.dayHours}
                  onChangeText={(text) => updateRam('dayHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per on-call (Ramadan)">
                <NumberInput
                  value={ramForm.oncallHours}
                  onChangeText={(text) => updateRam('oncallHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Number of on-calls in Ramadan month">
                <NumberInput
                  value={ramForm.oncallCount}
                  onChangeText={(text) => updateRam('oncallCount', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <Text style={styles.resultsTitle}>Results</Text>
            <View style={styles.resultsCard}>
              <ResultRow label="Total Ramadan days" value={ramadanResults.totalDays.toFixed(1)} unit="days" />
              <ResultRow
                label="Weekdays vs weekends"
                value={`${ramadanResults.weekdays.toFixed(1)} wk · ${ramadanResults.weekendDays.toFixed(1)} we`}
              />
              <ResultRow label="Baseline hours (before vacation)" value={ramadanResults.baselineTotal.toFixed(1)} unit="h" />
              <ResultRow label="Vacation hours – assistants" value={ramadanResults.vacAssistHours.toFixed(1)} unit="h" />
              <ResultRow label="Vacation hours – coordinator" value={ramadanResults.vacCoordHours.toFixed(1)} unit="h" />
              <ResultRow label="Effective baseline after vacation" value={ramadanResults.effectiveBaseline.toFixed(1)} unit="h" />
              <ResultRow label="Required hours – day shifts" value={ramadanResults.dayShiftHours.toFixed(1)} unit="h" />
              <ResultRow label="Required hours – on-calls" value={ramadanResults.oncallHours.toFixed(1)} unit="h" />
              <ResultRow label="Total required hours" value={ramadanResults.requiredTotal.toFixed(1)} unit="h" />
              <ResultRow
                label="Group overtime (Ramadan)"
                value={(ramadanResults.overtimeRounded > 0 ? '+' : '') + ramadanResults.overtimeRounded.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Load vs effective baseline"
                value={`${ramadanResults.loadRatio.toFixed(2)}× · ${ramadanResults.descriptor}`}
              />
            </View>
          </View>
        )}

        {activeTab === 'mixed' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🔄 Mixed period (Ramadan + non-Ramadan)</Text>
            <Text style={styles.sectionSubtitle}>
              One group covers both segments. Enter baselines per day and coverage patterns.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>👥 Assistants & per-day baselines</Text>
              <Field label="# assistant consultants (incl. coordinator)">
                <NumberInput
                  value={mixForm.totalAssistants}
                  onChangeText={(text) => updateMix('totalAssistants', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Schedule coordinator included?">
                <TouchableOpacity
                  onPress={() => updateMix('includeCoordinator', !mixForm.includeCoordinator)}
                  style={[styles.toggle, mixForm.includeCoordinator && styles.toggleActive]}
                >
                  <Text style={styles.toggleText}>
                    {mixForm.includeCoordinator ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              </Field>
              <Field label="Baseline per Ramadan day – assistant">
                <NumberInput
                  value={mixForm.baseRamAssistPerDay}
                  onChangeText={(text) => updateMix('baseRamAssistPerDay', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Baseline per Ramadan day – coordinator">
                <NumberInput
                  value={mixForm.baseRamCoordPerDay}
                  onChangeText={(text) => updateMix('baseRamCoordPerDay', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Baseline per non-Ramadan day – assistant">
                <NumberInput
                  value={mixForm.baseNonAssistPerDay}
                  onChangeText={(text) => updateMix('baseNonAssistPerDay', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Baseline per non-Ramadan day – coordinator">
                <NumberInput
                  value={mixForm.baseNonCoordPerDay}
                  onChangeText={(text) => updateMix('baseNonCoordPerDay', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>🌙 Ramadan days in this period</Text>
              <Field label="Ramadan days in this period">
                <NumberInput
                  value={mixForm.ramDays}
                  onChangeText={(text) => updateMix('ramDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Ramadan weekend days (Fri + Sat)">
                <NumberInput
                  value={mixForm.ramWeekendDays}
                  onChangeText={(text) => updateMix('ramWeekendDays', parseNumber(text, 0))}
                />
                <Text style={styles.hint}>
                  Weekdays auto: {mixedResults.ramWeekdays.toFixed(0)}
                </Text>
              </Field>
              <Field label="Ramadan vacation days – assistants">
                <NumberInput
                  value={mixForm.ramVacAssistDays}
                  onChangeText={(text) => updateMix('ramVacAssistDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Ramadan vacation days – coordinator">
                <NumberInput
                  editable={mixForm.includeCoordinator}
                  value={mixForm.ramVacCoordDays}
                  onChangeText={(text) => updateMix('ramVacCoordDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Assistants per Ramadan weekday">
                <NumberInput
                  value={mixForm.ramAssistWeekday}
                  onChangeText={(text) => updateMix('ramAssistWeekday', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Assistants per Ramadan weekend day">
                <NumberInput
                  value={mixForm.ramAssistWeekend}
                  onChangeText={(text) => updateMix('ramAssistWeekend', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per Ramadan day shift">
                <NumberInput
                  value={mixForm.ramDayHours}
                  onChangeText={(text) => updateMix('ramDayHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per Ramadan on-call">
                <NumberInput
                  value={mixForm.ramOncallHours}
                  onChangeText={(text) => updateMix('ramOncallHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Number of on-calls in Ramadan part">
                <NumberInput
                  value={mixForm.ramOncallCount}
                  onChangeText={(text) => updateMix('ramOncallCount', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>📅 Non-Ramadan days in this period</Text>
              <Field label="Non-Ramadan days in this period">
                <NumberInput
                  value={mixForm.nonDays}
                  onChangeText={(text) => updateMix('nonDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Non-Ramadan weekend days (Fri + Sat)">
                <NumberInput
                  value={mixForm.nonWeekendDays}
                  onChangeText={(text) => updateMix('nonWeekendDays', parseNumber(text, 0))}
                />
                <Text style={styles.hint}>
                  Weekdays auto: {mixedResults.nonWeekdays.toFixed(0)}
                </Text>
              </Field>
              <Field label="Non-Ramadan vacation days – assistants">
                <NumberInput
                  value={mixForm.nonVacAssistDays}
                  onChangeText={(text) => updateMix('nonVacAssistDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Non-Ramadan vacation days – coordinator">
                <NumberInput
                  editable={mixForm.includeCoordinator}
                  value={mixForm.nonVacCoordDays}
                  onChangeText={(text) => updateMix('nonVacCoordDays', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Assistants per non-Ramadan weekday">
                <NumberInput
                  value={mixForm.nonAssistWeekday}
                  onChangeText={(text) => updateMix('nonAssistWeekday', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Assistants per non-Ramadan weekend day">
                <NumberInput
                  value={mixForm.nonAssistWeekend}
                  onChangeText={(text) => updateMix('nonAssistWeekend', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per non-Ramadan day shift">
                <NumberInput
                  value={mixForm.nonDayHours}
                  onChangeText={(text) => updateMix('nonDayHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Hours per non-Ramadan on-call">
                <NumberInput
                  value={mixForm.nonOncallHours}
                  onChangeText={(text) => updateMix('nonOncallHours', parseNumber(text, 0))}
                />
              </Field>
              <Field label="Number of on-calls in non-Ramadan part">
                <NumberInput
                  value={mixForm.nonOncallCount}
                  onChangeText={(text) => updateMix('nonOncallCount', parseNumber(text, 0))}
                />
              </Field>
            </View>

            <Text style={styles.resultsTitle}>Results</Text>
            <View style={styles.resultsCard}>
              <ResultRow
                label="Ramadan days"
                value={`${mixedResults.ramDays.toFixed(1)} days (${mixedResults.ramWeekdays.toFixed(1)} wk · ${mixedResults.ramWeekend.toFixed(1)} we)`}
              />
              <ResultRow label="Ramadan baseline (after vacation)" value={mixedResults.ramEffBaseline.toFixed(1)} unit="h" />
              <ResultRow label="Ramadan required hours" value={mixedResults.ramRequired.toFixed(1)} unit="h" />
              <ResultRow
                label="Ramadan overtime"
                value={(mixedResults.ramOvertime > 0 ? '+' : '') + mixedResults.ramOvertime.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Non-Ramadan days"
                value={`${mixedResults.nonDays.toFixed(1)} days (${mixedResults.nonWeekdays.toFixed(1)} wk · ${mixedResults.nonWeekend.toFixed(1)} we)`}
              />
              <ResultRow label="Non-Ramadan baseline (after vacation)" value={mixedResults.nonEffBaseline.toFixed(1)} unit="h" />
              <ResultRow label="Non-Ramadan required hours" value={mixedResults.nonRequired.toFixed(1)} unit="h" />
              <ResultRow
                label="Non-Ramadan overtime"
                value={(mixedResults.nonOvertime > 0 ? '+' : '') + mixedResults.nonOvertime.toFixed(1)}
                unit="h"
              />
              <ResultRow label="Combined baseline (after vacations)" value={mixedResults.combinedBaseline.toFixed(1)} unit="h" />
              <ResultRow label="Combined required hours" value={mixedResults.combinedRequired.toFixed(1)} unit="h" />
              <ResultRow
                label="Total overtime (mixed period)"
                value={(mixedResults.combinedRounded > 0 ? '+' : '') + mixedResults.combinedRounded.toFixed(1)}
                unit="h"
              />
              <ResultRow
                label="Load vs combined baseline"
                value={`${mixedResults.loadRatio.toFixed(2)}× · ${mixedResults.descriptor}`}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    color: '#e5e7eb',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 14,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    backgroundColor: '#0b1220',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  tabButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  tabButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#0b1120',
  },
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 18,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#9ca3af',
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sectionHeading: {
    color: '#e5e7eb',
    fontWeight: '700',
    marginBottom: 8,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    color: '#e5e7eb',
    marginBottom: 6,
    fontWeight: '600',
  },
  hint: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  inlineInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineText: {
    color: '#9ca3af',
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e5e7eb',
    flex: 1,
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  toggleActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  toggleText: {
    color: '#e5e7eb',
    fontWeight: '700',
  },
  resultsTitle: {
    color: '#e5e7eb',
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 8,
  },
  resultsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    color: '#9ca3af',
    fontSize: 13,
  },
  resultValue: {
    color: '#e5e7eb',
    fontWeight: '700',
  },
  resultUnit: {
    color: '#9ca3af',
    fontWeight: '500',
  },
});

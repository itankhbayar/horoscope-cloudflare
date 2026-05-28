import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as horoscopeService from '@astralis/lib/horoscopeService';
import type { City } from '@astralis/lib/types';
import { colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';
import { missingCityReportUrl, selectedCityMatchesQuery, toSelectedCity, type SelectedCity } from '../lib/city';

type Props = {
  label: string;
  query: string;
  selectedCity: SelectedCity | null;
  onQueryChange: (query: string) => void;
  onSelectCity: (city: SelectedCity) => void;
  error?: string;
  labelNativeId?: string;
};

const MIN_QUERY_LENGTH = 2;
const FALLBACK_CITIES: City[] = [
  { name: 'Ulaanbaatar', country: 'Mongolia', latitude: 47.9212, longitude: 106.9186, timezoneOffset: 8 },
  { name: 'Erdenet', country: 'Mongolia', latitude: 49.0276, longitude: 104.0444, timezoneOffset: 8 },
  { name: 'Darkhan', country: 'Mongolia', latitude: 49.4867, longitude: 105.9228, timezoneOffset: 8 },
  { name: 'Khovd', country: 'Mongolia', latitude: 48.0056, longitude: 91.6419, timezoneOffset: 7 },
];

export function CityPicker({
  label,
  query,
  selectedCity,
  onQueryChange,
  onSelectCity,
  error,
  labelNativeId,
}: Props): React.JSX.Element {
  const { palette, mode } = useAppearance();
  const isLight = mode === 'light';
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const trimmed = query.trim();
  const isResolved = selectedCityMatchesQuery(selectedCity, query);

  useEffect(() => {
    let alive = true;
    setSearchError(null);
    if (trimmed.length < MIN_QUERY_LENGTH || isResolved) {
      setResults([]);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    setLoading(true);
    const timer = setTimeout(() => {
      void horoscopeService
        .searchCities(trimmed, 8)
        .then((items) => {
          if (!alive) return;
          setResults(items);
          setReportMessage(null);
        })
        .catch((e) => {
          if (!alive) return;
          setResults([]);
          setSearchError(e instanceof Error ? e.message : 'Could not search cities');
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 220);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [isResolved, trimmed]);

  const status = useMemo(() => {
    if (isResolved && selectedCity) return `Selected ${selectedCity.displayLabel}`;
    if (trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH) return 'Type at least 2 characters to search.';
    if (loading) return 'Searching cities...';
    if (searchError) return searchError;
    if (trimmed.length >= MIN_QUERY_LENGTH && results.length === 0) {
      return 'No exact match yet. Try a nearby larger city such as Ulaanbaatar, Erdenet, Darkhan, Khovd, or the regional capital you identify with most.';
    }
    return null;
  }, [isResolved, loading, results.length, searchError, selectedCity, trimmed.length]);

  const canReportMissingCity = !loading && !searchError && !isResolved && trimmed.length >= MIN_QUERY_LENGTH && results.length === 0;

  async function reportMissingCity(): Promise<void> {
    setReportMessage(null);
    try {
      const url = missingCityReportUrl(trimmed);
      if (!(await Linking.canOpenURL(url))) {
        setReportMessage('Email is not available on this device. Try another spelling or the closest larger city.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      setReportMessage('Could not open email. Try another spelling or the closest larger city.');
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: palette.textMuted }]} nativeID={labelNativeId}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: error ? colors.danger : isResolved ? colors.success : palette.border,
            color: palette.text,
            backgroundColor: isLight ? '#ffffff' : palette.surface,
          },
        ]}
        value={query}
        onChangeText={onQueryChange}
        autoComplete="postal-address-locality"
        autoCapitalize="words"
        placeholder="Start typing a city"
        placeholderTextColor={palette.textMuted}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelNativeId}
      />
      {status ? (
        <View style={styles.statusRow}>
          {loading ? <ActivityIndicator size="small" color={palette.accent} /> : null}
          <Text
            style={[
              styles.statusText,
              { color: searchError || error ? colors.danger : isResolved ? colors.success : palette.textMuted },
            ]}
            accessibilityRole={searchError || error ? 'alert' : undefined}
          >
            {status}
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {canReportMissingCity ? (
        <View style={[styles.fallbackBox, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
          <Text style={[styles.fallbackText, { color: palette.textMuted }]}>
            Exact small-town matching is still expanding. Choosing the nearest larger city keeps the chart usable, and you can refine it later.
          </Text>
          <View style={styles.fallbackCityRow}>
            {FALLBACK_CITIES.map((city) => (
              <Pressable
                key={city.name}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.fallbackCityButton,
                  { borderColor: palette.border },
                  pressed && styles.pressed,
                ]}
                onPress={() => onSelectCity(toSelectedCity(city))}
                accessibilityRole="button"
                accessibilityLabel={`Use nearby larger city ${city.name}`}
              >
                <Text style={[styles.fallbackCityText, { color: palette.text }]}>{city.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => void reportMissingCity()}
            accessibilityRole="button"
            accessibilityLabel={`Report missing city ${trimmed}`}
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.reportLink, { color: palette.accent }]}>Report missing city</Text>
          </Pressable>
          {reportMessage ? <Text style={[styles.fallbackText, { color: palette.textMuted }]}>{reportMessage}</Text> : null}
        </View>
      ) : null}
      {results.length > 0 && !isResolved ? (
        <View style={[styles.results, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
          {results.map((city) => {
            const selected = toSelectedCity(city);
            return (
              <Pressable
                key={`${city.name}-${city.country}-${city.latitude}-${city.longitude}`}
                style={({ pressed }: { pressed: boolean }) => [styles.resultRow, pressed && styles.pressed]}
                onPress={() => onSelectCity(selected)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${selected.displayLabel}`}
                hitSlop={hitSlopComfortable}
              >
                <View style={styles.resultCopy}>
                  <Text style={[styles.resultName, { color: palette.text }]}>{city.name}</Text>
                  <Text style={[styles.resultMeta, { color: palette.textMuted }]}>
                    {city.country} · UTC{city.timezoneOffset >= 0 ? `+${city.timezoneOffset}` : city.timezoneOffset}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  label: { marginBottom: spacing.xs, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  statusRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: { flex: 1, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, marginTop: spacing.xs, fontSize: 13, lineHeight: 18 },
  fallbackBox: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: spacing.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  fallbackText: { fontSize: 12, lineHeight: 17 },
  fallbackCityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  fallbackCityButton: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackCityText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  reportLink: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  results: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  resultRow: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  resultCopy: { gap: 2 },
  resultName: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  resultMeta: { fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.84 },
});

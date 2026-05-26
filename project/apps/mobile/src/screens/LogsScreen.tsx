import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { appLogger, type LogEntry } from '../lib/logger';

export default function LogsScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    await appLogger.init();
    const allLogs = appLogger.getLogs();
    setLogs(allLogs.reverse()); // 最新的在前
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.level === filter);

  const handleClear = () => {
    Alert.alert(
      '确认清除',
      '确定要清除所有日志吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: async () => {
            await appLogger.clear();
            setLogs([]);
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const logText = await appLogger.export();
      await Share.share({
        message: logText,
        title: 'LinkChest 应用日志',
      });
    } catch (e) {
      Alert.alert('导出失败', String(e));
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '#FF4444';
      case 'warn': return '#FFAA00';
      case 'info': return '#00AAFF';
      case 'debug': return '#888888';
    }
  };

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.level) }]}>
          <Text style={styles.levelText}>{item.level.toUpperCase()}</Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      {item.data && (
        <Text style={styles.data}>{item.data}</Text>
      )}
    </View>
  );

  const filters: { key: LogEntry['level'] | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'debug', label: '调试' },
    { key: 'info', label: '信息' },
    { key: 'warn', label: '警告' },
    { key: 'error', label: '错误' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>应用日志</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExport} style={styles.actionButton}>
            <Ionicons name="share-outline" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={22} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>暂无日志</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  list: {
    padding: 12,
  },
  logItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  levelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  data: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});

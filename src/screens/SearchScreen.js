import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';

const DAMAI_SEARCH = 'https://search.damai.cn/search.htm?keyword=';

const SearchScreen = ({ navigation }) => {
  const [keyword, setKeyword] = useState('');
  const [searchUrl, setSearchUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearchUrl(`${DAMAI_SEARCH}${encodeURIComponent(keyword.trim())}`);
  };

  const handleUseKeyword = () => {
    navigation.navigate('Config', { presetKeyword: keyword });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="搜索演唱会、歌手..."
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {keyword.length > 0 && (
        <TouchableOpacity style={styles.useButton} onPress={handleUseKeyword}>
          <Text style={styles.useButtonText}>
            将 "{keyword}" 设为抢票关键词
          </Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e63946" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      )}

      {searchUrl && (
        <WebView
          source={{ uri: searchUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#e63946',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  useButton: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  useButtonText: {
    color: '#1976D2',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  webview: {
    flex: 1,
  },
});

export default SearchScreen;

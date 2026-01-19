import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileItem } from './buttons/fileUploadButton';
import { formatFileSize } from '@/utils/fileUtils';
import { useTheme } from '@/contexts/ThemeContext';

type Props = {
    files: FileItem[];
    onDelete: (id: string) => void;
}

export default function FileList({files, onDelete}: Props){
    const { colors } = useTheme();
    
    if (files.length === 0) {
        return null;
    }
    
    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.scrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
            >
                {files.map((item) => (
                    <View key={item.id} style={[styles.fileItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <Ionicons 
                            name={item.type === 'pdf' ? 'document-text' : 'image'} 
                            size={24} 
                            color={colors.textPrimary} 
                        />
                        <View style={styles.fileInfo}>
                            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            {item.size && (
                                <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                                    {formatFileSize(item.size)}
                                </Text>
                            )}
                        </View>
                        <Pressable 
                            onPress={() => onDelete(item.id)}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="close-circle" size={24} color={colors.error} />
                        </Pressable>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxHeight: 200,
        marginVertical: 10,
    },
    scrollView: {
        width: '100%',
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        gap: 12,
        borderWidth: 1,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: '500',
    },
    fileSize: {
        fontFamily: 'Inter',
        fontSize: 12,
        marginTop: 2,
    },
    deleteButton: {
        padding: 4,
    },
});


import axios from "axios";

const WEBHDFS_URL = process.env.WEBHDFS_URL || "http://localhost:9870/webhdfs/v1";
const HADOOP_USER = process.env.HADOOP_USER || "hadoop";

export class HadoopService {

    static async uploadToHdfs(hdfsPath: string, fileContent: string): Promise<boolean> {
        try {
            const initUrl = `${WEBHDFS_URL}${hdfsPath}?op=CREATE&overwrite=true&user.name=${HADOOP_USER}`;
            const response = await axios.put(initUrl, null, {
                maxRedirects: 0,
                validateStatus: (status) => status === 307
            });

            const dataNodeUrl = response.headers.location;
            if (!dataNodeUrl) {
                throw new Error("Gagal mendapatkan URL pengalihan DataNode dari NameNode");
            }

            await axios.put(dataNodeUrl, fileContent, {
                headers: { 'Content-Type': 'text/plain' } // text/plain karena data berupa csv
            });

            console.log(`[HadoopService] Sukses mengunggah file ke HDFS: ${hdfsPath}`);
            return true;
        } catch (error: any) {
            console.error(`[HadoopService] Gagal mengunggah file ke HDFS: ${hdfsPath}`)
            throw error;
        }
    }

    static async readFromHadoop(hdfsPath: string): Promise<string> {
        try {
            const openUrl = `${WEBHDFS_URL}${hdfsPath}?op=OPEN&user.name=${HADOOP_USER}`;
            const response = await axios.get(openUrl);
            return response.data;
        } catch (error: any) {
            console.error("[HadoopService] Gagal membaca data dari Hadoop", error.message);
            throw error;
        }
    }

    static async listDirectory(hdfsPath: string): Promise<any[]> {
        try {
            const url = `${WEBHDFS_URL}${hdfsPath}?op=LISTSTATUS&user.name=${HADOOP_USER}`;
            const response = await axios.get(url);

            // Mengembalikan array informasi file dari Hadoop
            return response.data.FileStatuses.FileStatus || [];
        } catch (error: any) {
            console.error("[HadoopService] Gagal mendapatkan daftar file HDFS:", error.message);
            return [];
        }
    }

}
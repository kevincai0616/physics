let categoryChart = null;
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
// ================= OCR（备用） =================
async function ocrImage(file) {
    return new Promise((resolve) => {
        Tesseract.recognize(file, 'eng+chi_sim')
            .then(({ data: { text } }) => resolve(text));
    });
}

// ================= 模拟解析 =================
async function aiAnalysis(text) {

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY"
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "system",
                    content: "你是一个物理老师，用中文+英文双语讲解物理题，包含步骤、公式和知识点"
                },
                {
                    role: "user",
                    content: text
                }
            ]
        })
    });

    const data = await response.json();

    return {
        answer: data.choices[0].message.content
    };
}

// ================= 显示结果 =================
function showResult(data) {
    document.getElementById("type").innerText = data.type;
    document.getElementById("knowledge").innerText = data.knowledge;
    document.getElementById("cn").innerText = data.cn;
    document.getElementById("en").innerText = data.en;
    document.getElementById("history").innerText = data.history;
}

// ================= 错题本 =================

async function renderNotebook() {

    const list = document.getElementById("notebookList");

    list.innerHTML = "";
    const keyword =
        document.getElementById("searchInput")
        ?.value
        .toLowerCase() || "";

    const { data, error } = await supabaseClient
        .from("mistakes")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        list.innerHTML = "<p>读取失败</p>";
        return;
    }
    const filteredData = data.filter(item =>
        item.question
            .toLowerCase()
            .includes(keyword)
    );

    if (filteredData.length === 0) {
        list.innerHTML = "<p>暂无错题</p>";
        return;
    }

    filteredData.forEach((item) => {

        const categoryColor = {
            "力学": "#1e88e5",
            "电学": "#e53935",
            "光学": "#43a047",
            "热学": "#fb8c00",
            "其他": "#757575"
        };

        const color =
            categoryColor[item.category] || "#757575";

        const div = document.createElement("div");

        div.className = "card";

        div.innerHTML = `
            <div
                style="
                display:inline-block;
                padding:4px 10px;
                border-radius:12px;
                background:${color};
                color:white;
                font-size:12px;
                margin-bottom:8px;
            ">
                ${item.category}
            </div>

            <p>
                <b>题目：</b>
                ${item.question}
            </p>

            <p style="font-size:12px;color:#666;">
                ${new Date(item.created_at).toLocaleString()}
            </p>

            <button
                class="deleteBtn"
                data-id="${item.id}">
                🗑 删除
            </button>
        `;

        list.appendChild(div);
    });

    document.querySelectorAll(".deleteBtn")
        .forEach(btn => {

            btn.onclick = async function () {

                const id = this.dataset.id;

                await deleteQuestion(id);

            };

        });

}
async function renderStatistics() {

    const { data, error } = await supabaseClient
        .from("mistakes")
        .select("category");

    if (error) {
        console.error(error);
        return;
    }

    const counts = {
        力学: 0,
        电学: 0,
        光学: 0,
        热学: 0,
        其他: 0
    };

    data.forEach(item => {

        if (counts[item.category] !== undefined) {
            counts[item.category]++;
        } else {
            counts["其他"]++;
        }

    });

    const ctx =
        document.getElementById("categoryChart");

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "错题分类统计"
                }
            }
        }
    });

}

    document.getElementById("clearNotebookBtn").onclick = function () {

    if (confirm("确定清空全部错题吗？")) {

        renderNotebook();
        renderStatistics();
    }

};

async function deleteQuestion(id) {

    if (!confirm("确定删除这道错题吗？")) {
        return;
    }

    const { error } = await supabaseClient
        .from("mistakes")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("删除失败");
        return;
    }

    renderNotebook();
    renderStatistics();
}

// ================= 页面加载后绑定事件（关键修复） =================
window.onload = function () {

    console.log("JS加载成功");

    // -------- 分析按钮 --------
    document.getElementById("analyzeBtn").onclick = async function () {

        let text = document.getElementById("questionInput").value;
        const file = document.getElementById("imageInput").files[0];

        if (file) {
            text = await ocrImage(file);
        }

        const result = await aiAnalysis(text);
        document.getElementById("cn").innerText = result.answer;
    };
    document
    .getElementById("searchInput")
    .addEventListener("input", () => {
        renderNotebook();

    });
}

    // -------- 错题本按钮（已修复） --------
    const saveBtn = document.getElementById("saveBtn");

    if (saveBtn) {
        saveBtn.onclick = async function () {

    const question =
        document.getElementById("questionInput").value;

        await supabaseClient
            .from("mistakes")
            .insert([
                {
                    question: question,
                    category: classifyQuestion(question)
                }
            ]);

        renderNotebook();
        renderStatistics();

        alert("已加入云端错题本 ⭐");
        };
    }

    renderNotebook();
    renderStatistics();
    
function classifyQuestion(question) {

    const text = question.toLowerCase();

    if (
        text.includes("力") ||
        text.includes("牛顿") ||
        text.includes("加速度") ||
        text.includes("速度") ||
        text.includes("运动")
    ) {
        return "力学";
    }

    if (
        text.includes("电") ||
        text.includes("电流") ||
        text.includes("电压") ||
        text.includes("电阻")
    ) {
        return "电学";
    }

    if (
        text.includes("光") ||
        text.includes("透镜") ||
        text.includes("反射") ||
        text.includes("折射")
    ) {
        return "光学";
    }

    if (
        text.includes("热") ||
        text.includes("温度") ||
        text.includes("内能")
    ) {
        return "热学";
    }

    return "其他";
}


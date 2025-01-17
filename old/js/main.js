async function loadBlogs() {
    const response = await fetch('./blogs.json');
    const blogFiles = await response.json();
    const blogList = document.getElementById('blog-list');
    blogFiles.forEach(file => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${file}`;
        link.textContent = file.replace('.md', '');
        listItem.appendChild(link);
        blogList.appendChild(listItem);
    });
}

async function loadMarkdown(file) {
    const response = await fetch(`./blogs/${file}`);
    const markdown = await response.text();
    document.getElementById('blog-content').innerHTML = marked(markdown);
}

document.getElementById('blog-list').addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        const file = e.target.getAttribute('href').substring(1);
        loadMarkdown(file);
    }
});

loadBlogs();
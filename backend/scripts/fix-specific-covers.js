require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../models/Book');
const { generateCover } = require('../utils/coverGenerator');

const TARGET_BOOKS = [
    { title: "The Trapped Girl (Tracy Crosswhite, #4)", author: "Robert Dugoni" },
    { title: "Behind Closed Doors (Daniels Brothers, #1)", author: "Sherri Hayes" },
    { title: "You Will Know Me", author: "Megan Abbott" },
    { title: "The Burning Room (Harry Bosch, #17; Harry Bosch Universe, #26)", author: "Michael Connelly" },
    { title: "A Good Girl's Guide to Murder (A Good Girl's Guide to Murder, #1)", author: "Holly  Jackson" },
    { title: "My Lovely Wife", author: "Samantha  Downing" },
    { title: "The Art of Racing in the Rain", author: "Garth Stein" },
    { title: "Fish in a Tree", author: "Lynda Mullaly Hunt" },
    { title: "Dividers", author: "Travis Adams" },
    { title: "Irish Chips in a Bag Classy Mr Murray: A heartwarming love story…", author: "Margaret Kelleher" },
    { title: "The Wave of the Future", author: "Duane DeMello" },
    { title: "Burned Out", author: "Dean Mafako" },
    { title: "The Beech Tree", author: "Don Phelan" },
    { title: "Anathema Rhodes: Dreams", author: "Iimani David" },
    { title: "The Last Juror", author: "John Grisham" },
    { title: "Deep Storm (Jeremy Logan, #1)", author: "Lincoln Child" },
    { title: "The Girl Who Loved Tom Gordon", author: "Stephen King" },
    { title: "The Pelican Brief", author: "John Grisham" },
    { title: "The Silent Patient", author: "Alex Michaelides" },
    { title: "The Long Goodbye (Philip Marlowe, #6)", author: "Raymond Chandler" },
    { title: "Original Sin (Adam Dalgliesh, #9)", author: "P.D. James" },
    { title: "Drive Your Plow Over the Bones of the Dead", author: "Olga Tokarczuk" },
    { title: "The Rithmatist (The Rithmatist, #1)", author: "Brandon Sanderson" },
    { title: "The Collectors (The Camel Club, #2)", author: "David Baldacci" },
    { title: "The Face of a Stranger (William Monk, #1)", author: "Anne Perry" },
    { title: "Ella's Love", author: "Jasmine  Lee" },
    { title: "Loving What Is: Four Questions That Can Change Your Life", author: "Byron Katie" },
    { title: "Hamilton: The Revolution", author: "Lin-Manuel Miranda" },
    { title: "Walks Away Woman", author: "Ki Longfellow" },
    { title: "Beautiful Ruins", author: "Jess Walter" },
    { title: "As Snow Falls", author: "Elle Klass" },
    { title: "The Water Walls", author: "iLana Markarov" },
    { title: "A Man with A White Shadow", author: "Vikram Suryawanshi" },
    { title: "Jack's Day (Jack's Reign, #1)", author: "Julie Mannino" },
    { title: "Before I Fall", author: "Lauren Oliver" },
    { title: "No Ordinary Day", author: "Polly Becks" },
    { title: "Heart of a Warrior Angel", author: "Lali A.  Love" },
    { title: "The King Who Disappeared", author: "Hank Quense" },
    { title: "Sky Child (Sky Child, #1)", author: "T.M. Brenner" },
    { title: "Hard Kill (The Rizwan Sabir Mysteries #1)", author: "Charlie Flowers" },
    { title: "White: The Great Pursuit (The Circle, #3)", author: "Ted Dekker" },
    { title: "The Wrath of Truth (The Wages of Sin, #2)", author: "L.E.  Parker" },
    { title: "Twisted", author: "Anna Gallegos" },
    { title: "Twisted (Sinister Tales, #2)", author: "Anna Gallegos" },
    { title: "Demented (Sinister Tales Book 1)", author: "Anna Gallegos" },
    { title: "Demented (Sinister Tales, #1)", author: "Anna Gallegos" },
    { title: "Fever Dream (Pendergast, #10)", author: "Douglas Preston" },
    { title: "Thicker Than Blood (Marchwood Vampires, #2)", author: "Shalini Boland" },
    { title: "Flowers in the Attic (Dollanganger, #1)", author: "V.C. Andrews" },
    { title: "Plague of the Dead (Morningstar Strain #1)", author: "Z.A. Recht" }
];

async function updateSpecificBooks() {
    try {
        console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB.');

        let updatedCount = 0;

        for (const target of TARGET_BOOKS) {
            // Find the book, matching title as a substring and ignoring author to bypass exact typos
            const book = await Book.findOne({ 
                title: new RegExp(`^${target.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                author: new RegExp(`^${target.author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
            });

            if (book) {
                console.log(`Generating cover for: "${book.title}" by ${book.author}`);
                const newUri = await generateCover(book.title, book.author);
                book.thumbnailUrl = newUri;
                await book.save();
                updatedCount++;
                console.log(`   -> Successfully replaced cover.`);
            } else {
                console.log(`⚠️ Book not found in database: "${target.title}" by ${target.author}`);
            }
        }

        console.log(`\n=== Update Complete ===`);
        console.log(`Total covers replaced: ${updatedCount} / ${TARGET_BOOKS.length}`);

    } catch (e) {
        console.error('Script Error:', e);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    }
}

updateSpecificBooks();
